import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Âncora do Eco com o db real (F11-D6): excluir Personagem/Pessoa tira a
// âncora dos Ecos (o Eco fica), o Desfazer devolve, e mesclar Pessoas
// redireciona. O módulo puro é coberto em ancora-eco.test.js.

const { db, deleteItem, mesclarPessoas } = await import('../js/db.js');

function montar() {
    db.personagens.length = 0;
    db.pessoas.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();

    db.personagens.push(
        { id: 1, nome: 'Iara', origem: '', notas: '' },
        { id: 2, nome: 'Tomás', origem: '', notas: '' },
    );
    db.pessoas.push({ id: 5, nome: 'Marina' }, { id: 6, nome: 'Paulo' });
    db.poemas.push({
        id: 10,
        titulo: 'Maré',
        sequencia: 1,
        personagens: [{ personagemId: 1 }, { personagemId: 2 }],
        pessoas: [{ pessoaId: 5, papeis: [] }],
        conceitos: { elos: [], ecos: [] },
    });
    db.prosas.push({
        id: 20,
        titulo: 'Cais',
        sequencia: 1,
        personagens: [{ personagemId: 1 }, { personagemId: 2 }],
        pessoas: [{ pessoaId: 5, papeis: [] }],
        conceitos: {
            elos: [],
            ecos: [
                {
                    id: 10,
                    tipo: 'Personagem em comum',
                    texto: 'nota',
                    ancoras: [
                        { especie: 'personagem', id: 1 },
                        { especie: 'personagem', id: 2 },
                    ],
                },
                {
                    id: 10,
                    tipo: 'Pessoa em comum',
                    texto: '',
                    ancoras: [{ especie: 'pessoa', id: 5 }],
                },
            ],
        },
    });
}

describe('âncora do Eco na exclusão e no Desfazer', () => {
    beforeEach(montar);

    it('excluir o Personagem tira só a âncora dele; o Eco fica; Desfazer devolve', () => {
        deleteItem('personagens', 1);
        document.getElementById('excl-confirmar').click();

        const ecos = db.prosas[0].conceitos.ecos;
        assert.equal(ecos.length, 2);
        assert.deepEqual(ecos[0].ancoras, [{ especie: 'personagem', id: 2 }]);
        assert.equal(ecos[0].texto, 'nota');

        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(db.prosas[0].conceitos.ecos[0].ancoras, [
            { especie: 'personagem', id: 1 },
            { especie: 'personagem', id: 2 },
        ]);
    });

    it('excluir a única âncora deixa o Eco sem o campo, e Desfazer recoloca', () => {
        deleteItem('pessoas', 5);
        document.getElementById('excl-confirmar').click();

        const eco = db.prosas[0].conceitos.ecos[1];
        assert.equal(eco.tipo, 'Pessoa em comum');
        assert.equal('ancoras' in eco, false);

        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(db.prosas[0].conceitos.ecos[1].ancoras, [{ especie: 'pessoa', id: 5 }]);
    });

    it('excluir quem não ancora nada não mexe nos Ecos', () => {
        deleteItem('pessoas', 6);
        document.getElementById('excl-confirmar').click();
        assert.equal(db.prosas[0].conceitos.ecos[0].ancoras.length, 2);
        assert.equal(db.prosas[0].conceitos.ecos[1].ancoras.length, 1);
    });
});

describe('âncora do Eco na mesclagem de Pessoas', () => {
    beforeEach(montar);

    it('a âncora da origem passa para o destino', () => {
        mesclarPessoas(db, 5, 6);
        assert.deepEqual(db.prosas[0].conceitos.ecos[1].ancoras, [{ especie: 'pessoa', id: 6 }]);
        assert.equal(
            db.pessoas.some((p) => p.id == 5),
            false,
        );
    });
});
