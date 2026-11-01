import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    chaveDeOrigem,
    opcoesDeOrigem,
    livroCadastradoDigitado,
    valoresSugeridos,
    livroDaOrigemDigitada,
    completarCaminhoDigitado,
} from '../js/opcoes-origem.js';

function banco() {
    return {
        livros: [
            { id: 1, titulo: 'Livro Um' },
            { id: 2, titulo: 'Livro Dois' },
        ],
        partes: [
            { id: 100, livroId: 1, titulo: 'Parte A' },
            { id: 101, livroId: 1, titulo: 'Parte B' },
            { id: 102, livroId: 2, titulo: 'Parte C' },
        ],
        secoes: [
            { id: 200, paiTipo: 'parte', paiId: 100, titulo: '1. Viagens' },
            { id: 201, paiTipo: 'parte', paiId: 101, titulo: '1. Viagens' },
            { id: 202, paiTipo: 'livro', paiId: 1, titulo: 'Solta' },
            { id: 203, paiTipo: 'parte', paiId: 102, titulo: 'Volta' },
            { id: 204, paiTipo: 'parte', paiId: 100, titulo: '' },
            { id: 205, paiTipo: 'parte', paiId: 999, titulo: 'Órfã' },
        ],
    };
}

const valores = (ops) => ops.map((o) => o.valor).sort();

describe('opcoesDeOrigem', () => {
    it('monta o caminho completo de cada Parte e Seção', () => {
        assert.deepEqual(valores(opcoesDeOrigem(banco())), [
            'Parte A',
            'Parte A / 1. Viagens',
            'Parte B',
            'Parte B / 1. Viagens',
            'Parte C',
            'Parte C / Volta',
            'Solta',
        ]);
    });

    it('a mesma Seção em duas Partes vira duas opções, cada uma com o seu livro', () => {
        const ops = opcoesDeOrigem(banco()).filter((o) => o.ultimo === '1. Viagens');
        assert.equal(ops.length, 2);
        assert.ok(ops.every((o) => o.livroTitulo === 'Livro Um'));
    });

    it('deixa de fora Seção sem título e cadeia quebrada', () => {
        const todos = valores(opcoesDeOrigem(banco()));
        assert.ok(!todos.includes('Órfã'));
        assert.ok(!todos.some((v) => v.endsWith(' / ')));
    });

    it('banco vazio ou sem listas não quebra', () => {
        assert.deepEqual(opcoesDeOrigem({}), []);
        assert.deepEqual(opcoesDeOrigem(null), []);
    });

    it('Seção dentro de Seção entra com o caminho inteiro', () => {
        const b = banco();
        b.secoes.push({ id: 300, paiTipo: 'secao', paiId: 200, titulo: 'Subseção' });
        assert.ok(valores(opcoesDeOrigem(b)).includes('Parte A / 1. Viagens / Subseção'));
    });
});

describe('sugestões e livro digitado', () => {
    it('filtra pelo livro digitado e ignora a caixa', () => {
        const b = banco();
        const livro = livroCadastradoDigitado(b, ' livro DOIS ');
        assert.equal(livro.id, 2);
        assert.deepEqual(valoresSugeridos(opcoesDeOrigem(b), livro), [
            'Parte C',
            'Parte C / Volta',
        ]);
    });

    it('livro vazio ou fora do cadastro mostra tudo, sem repetir', () => {
        const b = banco();
        assert.equal(livroCadastradoDigitado(b, ''), null);
        assert.equal(livroCadastradoDigitado(b, 'Livro Antigo'), null);
        assert.equal(valoresSugeridos(opcoesDeOrigem(b), null).length, 7);
    });
});

describe('livroDaOrigemDigitada', () => {
    const ops = opcoesDeOrigem(banco());

    it('caminho completo aponta o livro, mesmo com espaços diferentes na barra', () => {
        assert.equal(livroDaOrigemDigitada(ops, 'parte c/volta'), 'Livro Dois');
    });

    it('nome só da Seção, sem ambiguidade, também aponta o livro', () => {
        assert.equal(livroDaOrigemDigitada(ops, 'Volta'), 'Livro Dois');
    });

    it('nome que existe em mais de um livro, ou em nenhum, não preenche', () => {
        const b = banco();
        b.secoes.push({ id: 206, paiTipo: 'parte', paiId: 102, titulo: '1. Viagens' });
        assert.equal(livroDaOrigemDigitada(opcoesDeOrigem(b), '1. Viagens'), null);
        assert.equal(livroDaOrigemDigitada(ops, 'Nada disso'), null);
        assert.equal(livroDaOrigemDigitada(ops, ''), null);
    });
});

describe('completarCaminhoDigitado', () => {
    const ops = opcoesDeOrigem(banco());

    it('completa o nome de uma Seção que mora numa Parte', () => {
        assert.equal(completarCaminhoDigitado(ops, 'volta'), 'Parte C / Volta');
    });

    it('não mexe no que já está completo, em Parte e em Seção solta no livro', () => {
        assert.equal(completarCaminhoDigitado(ops, 'Parte C / Volta'), null);
        assert.equal(completarCaminhoDigitado(ops, 'Parte A'), null);
        assert.equal(completarCaminhoDigitado(ops, 'Solta'), null);
    });

    it('nome ambíguo ou desconhecido fica como está', () => {
        assert.equal(completarCaminhoDigitado(ops, '1. Viagens'), null);
        assert.equal(completarCaminhoDigitado(ops, 'Texto livre antigo'), null);
        assert.equal(completarCaminhoDigitado(ops, ''), null);
    });

    it('o livro digitado desfaz a ambiguidade entre livros', () => {
        const b = banco();
        b.secoes.push({ id: 206, paiTipo: 'parte', paiId: 102, titulo: '1. Viagens' });
        const todas = opcoesDeOrigem(b);
        assert.equal(completarCaminhoDigitado(todas, '1. Viagens'), null);
        assert.equal(
            completarCaminhoDigitado(todas, '1. Viagens', { id: 2 }),
            'Parte C / 1. Viagens',
        );
    });
});

describe('chaveDeOrigem', () => {
    it('normaliza caixa, espaços e a barra', () => {
        assert.equal(chaveDeOrigem('  Parte  A/Seção '), 'parte a / seção');
    });
});
