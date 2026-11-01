// Fase 2, Etapas 3 e 5: os escritores de Tema mexem só em `temas` (por id) e
// o campo antigo `sinalizacoesTema` não existe mais (a Etapa 5 parou de
// gravá-lo e o apaga de todo texto). Estes testes provam o que cada escritor
// deixa no texto, com papéis, e que o campo antigo nunca reaparece.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    gravarTemasNoTexto,
    reconciliarTemasDoTexto,
    renomearTema,
    mesclarTemas,
    adicionarTemasAosTextos,
    removerTemasDosTextos,
} from '../js/temas.js';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

// Cadastro: 1 amor, 2 Saudade, 3 Luto. Textos com papéis fora de ordem.
function dbBase() {
    return {
        temas: [
            { id: 1, nome: 'amor', notas: '' },
            { id: 2, nome: 'Saudade', notas: '' },
            { id: 3, nome: 'Luto', notas: '' },
        ],
        assuntos: [{ id: 50, nome: 'Afetos', notas: '', temaIds: [1, 2] }],
        poemas: [
            {
                id: 10,
                temas: [
                    { temaId: 1, papel: '' },
                    { temaId: 2, papel: 'principal' },
                    { temaId: 3, papel: 'secundario' },
                ],
            },
            { id: 11, temas: [{ temaId: 1, papel: 'secundario' }] },
            { id: 12, temas: [] },
        ],
        prosas: [
            {
                id: 20,
                temas: [
                    { temaId: 2, papel: 'secundario' },
                    { temaId: 3, papel: 'principal' },
                ],
            },
        ],
    };
}

const TEM_CAMPO_ANTIGO = (t) => Object.prototype.hasOwnProperty.call(t, 'sinalizacoesTema');

describe('o campo antigo `sinalizacoesTema` (Etapa 5)', () => {
    it('gravarTemasNoTexto grava só `temas` e apaga o campo antigo do texto', () => {
        const db = dbBase();
        const item = { sinalizacoesTema: 'lixo' };
        gravarTemasNoTexto(db, item, [
            { temaId: 1, papel: '' },
            { temaId: 3, papel: 'principal' },
        ]);
        assert.equal(TEM_CAMPO_ANTIGO(item), false);
        assert.equal(nomesDosTemas(item, db), 'Luto, amor');
    });

    it('reconciliarTemasDoTexto migra o formato antigo e apaga o campo, uma vez só', () => {
        const db = dbBase();
        const antigo = { sinalizacoesTema: 'Saudade, amor' };
        assert.equal(reconciliarTemasDoTexto(db, antigo), true);
        assert.deepEqual(antigo.temas, [
            { temaId: 2, papel: '' },
            { temaId: 1, papel: '' },
        ]);
        assert.equal(TEM_CAMPO_ANTIGO(antigo), false);
        assert.equal(nomesDosTemas(antigo, db), 'Saudade, amor');
        assert.equal(reconciliarTemasDoTexto(db, antigo), false);
    });

    it('com `temas` válidos o campo antigo divergente é só apagado, e os `temas` ficam', () => {
        const db = dbBase();
        const item = {
            temas: [{ temaId: 3, papel: 'principal' }],
            sinalizacoesTema: 'outro, amor',
        };
        assert.equal(reconciliarTemasDoTexto(db, item), true);
        assert.deepEqual(item.temas, [{ temaId: 3, papel: 'principal' }]);
        assert.equal(TEM_CAMPO_ANTIGO(item), false);
    });

    it('campo antigo vazio também é apagado; id inexistente é descartado', () => {
        const db = dbBase();
        const item = {
            temas: [
                { temaId: 999, papel: 'principal' },
                { temaId: 3, papel: '' },
            ],
            sinalizacoesTema: '',
        };
        assert.equal(reconciliarTemasDoTexto(db, item), true);
        assert.equal(nomesDosTemas(item, db), 'Luto');
        assert.equal(TEM_CAMPO_ANTIGO(item), false);
        assert.equal(reconciliarTemasDoTexto(db, null), false);
    });
});

describe('renomearTema (3a)', () => {
    it('muda o nome no cadastro sem perder o papel de cada texto', () => {
        const db = dbBase();
        const r = renomearTema(db, 2, 'Saudade profunda');
        assert.equal(r.ok, true);
        assert.equal(r.textos, 2);
        assert.equal(r.assuntos, 1);
        assert.equal(db.temas.find((t) => t.id === 2).nome, 'Saudade profunda');
        // temas por id intactos
        assert.deepEqual(db.poemas[0].temas[1], { temaId: 2, papel: 'principal' });
        assert.deepEqual(db.prosas[0].temas[0], { temaId: 2, papel: 'secundario' });
        // nomes lidos por id, mesma ordem de papéis
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Saudade profunda, Luto, amor');
        assert.equal(nomesDosTemas(db.prosas[0], db), 'Luto, Saudade profunda');
        // quem não tinha o Tema não é tocado
        assert.equal(nomesDosTemas(db.poemas[1], db), 'amor');
        assert.equal(nomesDosTemas(db.poemas[2], db), '');
    });

    it('trocar só caixa e acento do próprio nome é permitido', () => {
        const db = dbBase();
        assert.equal(renomearTema(db, 1, 'Amór').ok, true);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Saudade, Luto, Amór');
        assert.equal(nomesDosTemas(db.poemas[1], db), 'Amór');
    });

    it('recusa nome de outro Tema, nome vazio e Tema inexistente, sem mudar nada', () => {
        const db = dbBase();
        const antes = JSON.stringify(db);
        assert.equal(renomearTema(db, 1, ' LUTO ').motivo, 'duplicado');
        assert.equal(renomearTema(db, 1, '   ').motivo, 'vazio');
        assert.equal(renomearTema(db, 99, 'X').motivo, 'inexistente');
        assert.equal(JSON.stringify(db), antes);
    });

    it('texto só com espelho (sem temas) é migrado pelo id e renomeado com papel indefinido', () => {
        const db = dbBase();
        db.poemas.push({ id: 13, sinalizacoesTema: 'saudade, Luto' });
        const r = renomearTema(db, 2, 'Saudade nova');
        assert.equal(r.textos, 3);
        const velho = db.poemas[3];
        assert.deepEqual(velho.temas, [
            { temaId: 2, papel: '' },
            { temaId: 3, papel: '' },
        ]);
        assert.equal(nomesDosTemas(velho, db), 'Saudade nova, Luto');
        assert.equal(TEM_CAMPO_ANTIGO(velho), false);
    });

    it('depois de renomear, a reconciliação do save não muda mais nada', () => {
        const db = dbBase();
        renomearTema(db, 2, 'Saudade profunda');
        [...db.poemas, ...db.prosas].forEach((t) => {
            const antes = JSON.stringify(t);
            assert.equal(reconciliarTemasDoTexto(db, t), false);
            assert.equal(JSON.stringify(t), antes);
        });
    });
});

describe('mesclarTemas e Desfazer (3a)', () => {
    it('texto com os dois fica com um só, com o papel mais forte', () => {
        const db = dbBase();
        const r = mesclarTemas(db, 3, 2); // Luto entra em Saudade
        assert.equal(r.ok, true);
        assert.equal(r.textos, 2);
        assert.deepEqual(db.poemas[0].temas, [
            { temaId: 1, papel: '' },
            { temaId: 2, papel: 'principal' },
        ]);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Saudade, amor');
        assert.deepEqual(db.prosas[0].temas, [{ temaId: 2, papel: 'principal' }]);
        assert.equal(nomesDosTemas(db.prosas[0], db), 'Saudade');
        assert.equal(
            db.temas.some((t) => t.id === 3),
            false,
        );
    });

    it('texto que só tinha a origem passa a ter o destino, com o mesmo papel', () => {
        const db = dbBase();
        mesclarTemas(db, 1, 3); // amor entra em Luto
        assert.deepEqual(db.poemas[1].temas, [{ temaId: 3, papel: 'secundario' }]);
        assert.equal(nomesDosTemas(db.poemas[1], db), 'Luto');
    });

    it('Desfazer devolve os `temas` de todos os textos afetados', () => {
        const db = dbBase();
        const antes = JSON.stringify(db);
        const r = mesclarTemas(db, 3, 2);
        r.desfazer();
        assert.equal(JSON.stringify(db), antes);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Saudade, Luto, amor');
        assert.equal(nomesDosTemas(db.prosas[0], db), 'Luto, Saudade');
    });

    it('Desfazer não recria o campo antigo em nenhum texto', () => {
        const db = dbBase();
        const r = mesclarTemas(db, 3, 2);
        r.desfazer();
        [...db.poemas, ...db.prosas].forEach((t) => assert.equal(TEM_CAMPO_ANTIGO(t), false));
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Saudade, Luto, amor');
    });

    it('texto só com espelho (sem temas) entra na mesclagem e no Desfazer', () => {
        const db = dbBase();
        db.poemas.push({ id: 13, sinalizacoesTema: 'luto' });
        const r = mesclarTemas(db, 3, 1);
        assert.equal(r.textos, 3);
        assert.deepEqual(db.poemas[3].temas, [{ temaId: 1, papel: '' }]);
        assert.equal(nomesDosTemas(db.poemas[3], db), 'amor');
        r.desfazer();
        assert.equal(nomesDosTemas(db.poemas[3], db), 'Luto');
        assert.deepEqual(db.poemas[3].temas, [{ temaId: 3, papel: '' }]);
        assert.equal(TEM_CAMPO_ANTIGO(db.poemas[3]), false);
    });
});

describe('edição em massa de Tema (3b, D2)', () => {
    it('adicionar cria o Tema que falta e entra com papel indefinido', () => {
        const db = dbBase();
        const r = adicionarTemasAosTextos(db, [db.poemas[2], db.poemas[1]], ['Esperança']);
        assert.equal(r.criados, 1);
        assert.equal(r.textos, 2);
        const nova = db.temas.find((t) => t.nome === 'Esperança');
        assert.deepEqual(db.poemas[2].temas, [{ temaId: nova.id, papel: '' }]);
        assert.equal(nomesDosTemas(db.poemas[2], db), 'Esperança');
        assert.deepEqual(db.poemas[1].temas, [
            { temaId: 1, papel: 'secundario' },
            { temaId: nova.id, papel: '' },
        ]);
        assert.equal(nomesDosTemas(db.poemas[1], db), 'amor, Esperança');
    });

    it('adicionar não mexe no papel de quem já tinha o Tema', () => {
        const db = dbBase();
        const r = adicionarTemasAosTextos(db, [db.poemas[0]], ['SAUDADE']);
        assert.equal(r.textos, 0);
        assert.deepEqual(db.poemas[0].temas[1], { temaId: 2, papel: 'principal' });
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Saudade, Luto, amor');
    });

    it('remover tira só aquele Tema (por chave, sem caixa nem acento) e preserva os demais', () => {
        const db = dbBase();
        const r = removerTemasDosTextos(db, [db.poemas[0], db.prosas[0]], ['Inexistente']);
        assert.deepEqual(r.desconhecidos, ['Inexistente']);
        assert.equal(r.textos, 0);
        const r2 = removerTemasDosTextos(db, [db.poemas[0], db.prosas[0]], ['SAÚDADE']);
        assert.equal(r2.textos, 2);
        assert.equal(r2.vinculos, 2);
        assert.deepEqual(db.poemas[0].temas, [
            { temaId: 1, papel: '' },
            { temaId: 3, papel: 'secundario' },
        ]);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Luto, amor');
        assert.deepEqual(db.prosas[0].temas, [{ temaId: 3, papel: 'principal' }]);
        assert.equal(nomesDosTemas(db.prosas[0], db), 'Luto');
        // o Tema continua no cadastro
        assert.equal(
            db.temas.some((t) => t.id === 2),
            true,
        );
    });
});
