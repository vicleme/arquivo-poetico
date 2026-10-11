import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 11, etapa 5: busca de Personagem por papel (personagemvoz:,
// personageminterlocutor:, personagemaparicao:, personagemmencao:,
// personagemalusao:) e por centralidade (personagemprotagonista:,
// personagemsecundario:, personagemsemcentralidade:). Todos aceitam o nome
// ou `*` (campo preenchido); `personagem:` segue achando em qualquer papel.
const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const P = await import('../js/personagens.js');

const ids = (lista) => lista.map((i) => i.id);

function vinculo(personagemId, papeis, centralidade = '') {
    return { personagemId, papeis, centralidade };
}

function montar() {
    db.personagens = [
        { id: 1, nome: 'Capitu' },
        { id: 2, nome: 'Bento' },
        { id: 3, nome: 'Escobar' },
    ];
    db.poemas = [];
    db.prosas = [];
    const textos = [
        // 1: Capitu é Voz e Aparição (protagonista); Bento só Interlocutor, sem centralidade
        {
            id: 1,
            titulo: 'A',
            personagens: [
                vinculo(1, ['Voz', 'Aparição'], 'protagonista'),
                vinculo(2, ['Interlocutor']),
            ],
        },
        // 2: Bento secundário em Aparição; Escobar só Menção
        {
            id: 2,
            titulo: 'B',
            personagens: [vinculo(2, ['Aparição'], 'secundario'), vinculo(3, ['Menção'])],
        },
        // 3: Capitu só Alusão (centralidade não se aplica, mesmo gravada por engano)
        { id: 3, titulo: 'C', personagens: [vinculo(1, ['Alusão'], 'protagonista')] },
        // 4: sem personagens
        { id: 4, titulo: 'D', personagens: [] },
        // 5: papel ainda não definido, centralidade livre e vazia
        { id: 5, titulo: 'E', personagens: [vinculo(3, [])] },
    ];
    return textos.map((t) => decorarCamposBusca(t));
}

describe('Personagem por papel', () => {
    let itens;
    beforeEach(() => {
        itens = montar();
    });

    it('cada prefixo acha só o papel correspondente', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemvoz:Capitu')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personageminterlocutor:Bento')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemaparicao:Bento')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemmencao:Escobar')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemalusao:Capitu')), [3]);
    });

    it('o nome só vale no papel pedido', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemvoz:Bento')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemmencao:Capitu')), []);
    });

    it('o mesmo personagem aparece em mais de um papel', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'personagemvoz:Capitu personagemaparicao:Capitu')),
            [1],
        );
    });

    it('aceita acento e caixa no nome do prefixo e no nome da figura', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemaparição:bento')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'PersonagemMenção:escobar')), [2]);
    });

    it('`*` acha quem tem alguém naquele papel; `-` inverte', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemvoz:*')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemaparicao:*')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-personagemaparicao:*')), [3, 4, 5]);
    });

    it('`personagem:` segue achando em qualquer papel', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagem:Capitu')), [1, 3]);
    });

    it('combina com "ou" e com outros prefixos', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'personagemvoz:* ou personagemmencao:*')),
            [1, 2],
        );
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemaparicao:* -personagemvoz:*')), [2]);
    });

    it('não casa personagem sem cadastro', () => {
        const [t] = [{ id: 9, titulo: 'X', personagens: [vinculo(99, ['Voz'])] }].map((x) =>
            decorarCamposBusca(x),
        );
        assert.deepEqual(ids(filtrarTextos([t], 'personagemvoz:*')), []);
    });
});

describe('Personagem por centralidade', () => {
    let itens;
    beforeEach(() => {
        itens = montar();
    });

    it('protagonista e secundário', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemprotagonista:Capitu')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemsecundario:Bento')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemprotagonista:Bento')), []);
    });

    it('Menção/Alusão sozinhas não entram em nenhuma centralidade (nem a gravada por engano)', () => {
        // O texto 3 tem 'protagonista' gravado, mas só com Alusão: não se aplica.
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemprotagonista:*')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemsemcentralidade:Escobar')), [5]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemsemcentralidade:Capitu')), []);
    });

    it('sem centralidade = aplicável e ainda não preenchida', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemsemcentralidade:*')), [1, 5]);
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemsemcentralidade:Bento')), [1]);
    });

    it('`*` e exclusão', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'personagemsecundario:*')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-personagemsecundario:*')), [1, 3, 4, 5]);
    });
});

describe('registro dos prefixos', () => {
    it('todos têm a forma canônica para a UI', () => {
        const esperados = [
            'personagemvoz',
            'personageminterlocutor',
            'personagemaparicao',
            'personagemmencao',
            'personagemalusao',
            'personagemprotagonista',
            'personagemsecundario',
            'personagemsemcentralidade',
        ];
        const canonicos = Object.values(PREFIXOS_CANONICOS_POR_CAMPO);
        esperados.forEach((p) => assert.ok(canonicos.includes(p), p));
    });

    it('os helpers puros batem com a busca', () => {
        const t = { personagens: [vinculo(1, ['Voz', 'Menção'], 'secundario')] };
        const cad = [{ id: 1, nome: 'Capitu' }];
        assert.deepEqual(P.nomesPersonagensPorPapel(t, cad, 'Menção'), ['Capitu']);
        assert.deepEqual(P.nomesPersonagensPorCentralidade(t, cad, 'secundario'), ['Capitu']);
        assert.deepEqual(P.nomesPersonagensPorCentralidade(t, cad, ''), []);
    });
});
