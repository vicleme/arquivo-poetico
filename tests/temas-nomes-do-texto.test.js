import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { nomesTemasDoTexto, valorDaCategoria } from '../js/utils.js';

// Fase 2, Etapa 1: porta única de leitura dos Temas de um texto.
const temas = [
    { id: 1, nome: 'Amor' },
    { id: 2, nome: 'Saudade' },
    { id: 3, nome: 'Brasil' },
];

describe('nomesTemasDoTexto', () => {
    it('com `temas`, resolve pelo cadastro na ordem principal, secundário, indefinido', () => {
        const item = {
            temas: [
                { temaId: 3, papel: '' },
                { temaId: 2, papel: 'secundario' },
                { temaId: 1, papel: 'principal' },
            ],
            sinalizacoesTema: 'outra coisa',
        };
        assert.deepEqual(nomesTemasDoTexto(item, temas), ['Amor', 'Saudade', 'Brasil']);
    });

    it('usa o nome do cadastro (renomear não depende do espelho) e ignora id órfão', () => {
        const item = {
            temas: [
                { temaId: 99, papel: 'principal' },
                { temaId: 1, papel: '' },
            ],
            sinalizacoesTema: 'Nome velho',
        };
        assert.deepEqual(nomesTemasDoTexto(item, temas), ['Amor']);
    });

    it('sem `temas`, cai no espelho (sem repetir por chave)', () => {
        assert.deepEqual(nomesTemasDoTexto({ sinalizacoesTema: 'Amor, amor, café, Café' }, temas), [
            'Amor',
            'café',
        ]);
    });

    it('texto sem Tema, nulo ou sem cadastro devolve lista vazia', () => {
        assert.deepEqual(nomesTemasDoTexto({}, temas), []);
        assert.deepEqual(nomesTemasDoTexto(null, temas), []);
        assert.deepEqual(nomesTemasDoTexto({ temas: [{ temaId: 1, papel: '' }] }, undefined), []);
        assert.deepEqual(nomesTemasDoTexto({ temas: [] }, temas), []);
        // `temas` vazio com espelho preenchido: o espelho vence (como na reconciliação).
        assert.deepEqual(nomesTemasDoTexto({ temas: [], sinalizacoesTema: 'A, B' }, temas), [
            'A',
            'B',
        ]);
        // `temas` só com id órfão não cai no espelho.
        assert.deepEqual(
            nomesTemasDoTexto({ temas: [{ temaId: 99, papel: '' }], sinalizacoesTema: 'A' }, temas),
            [],
        );
    });
});

describe('valorDaCategoria', () => {
    const item = {
        temas: [
            { temaId: 2, papel: 'secundario' },
            { temaId: 1, papel: 'principal' },
        ],
        sinalizacoesTema: 'Amor, Saudade',
        sinalizacoesEstilo: 'Verso livre, Haicai',
        sinalizacoesTom: '',
    };

    it('tema vem de nomesTemasDoTexto, com o cadastro no objeto `cadastros`', () => {
        assert.equal(valorDaCategoria(item, 'tema', { temas }), 'Amor | Saudade');
        assert.equal(valorDaCategoria({ sinalizacoesTema: 'A, B' }, 'tema', { temas }), 'A | B');
    });

    it('as outras categorias leem o campo próprio, como sinalizacoesCombinadas', () => {
        assert.equal(valorDaCategoria(item, 'estilo', { temas }), 'Verso livre, Haicai');
        assert.equal(valorDaCategoria(item, 'estilo'), 'Verso livre, Haicai');
        assert.equal(valorDaCategoria(item, 'tom', { temas }), '');
        assert.equal(
            valorDaCategoria({ sinalizacoesTerritorialidade: 'x' }, 'territorialidade'),
            'x',
        );
    });

    it('categoria desconhecida e item nulo devolvem vazio', () => {
        assert.equal(valorDaCategoria(item, 'nao-existe', { temas }), '');
        assert.equal(valorDaCategoria(null, 'estilo', { temas }), '');
        assert.equal(valorDaCategoria(null, 'tema', { temas }), '');
    });
});
