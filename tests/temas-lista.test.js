// "Definir por lista" (aba Temas): a lista por assunto e por vitrine.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { planejarLista, aplicarLista, lerListaPorDestino } from '../js/temas-lista.js';

function montar() {
    return {
        temas: [
            { id: 1, nome: 'Machismo' },
            { id: 2, nome: 'Polarização' },
            { id: 3, nome: 'Luto: perda' },
            { id: 4, nome: 'Amor, perda' },
            { id: 5, nome: 'Saudade', valencia: 'desagradavel' },
        ],
        assuntos: [
            { id: 10, nome: 'Sociedade', temaIds: [1] },
            { id: 11, nome: 'Vínculos e relações', temaIds: [] },
        ],
        temasUniversais: [
            { id: 'u1', nome: 'Quando o amor acaba', temaIds: [4] },
            { id: 'u2', nome: 'Cidade', temaIds: [] },
        ],
        poemas: [],
        prosas: [],
    };
}

describe('lerListaPorDestino', () => {
    it('só reconhece cabeçalho que é um destino existente; o resto do ":" fica no nome', () => {
        const destinos = new Map([['sociedade', { id: 10, nome: 'Sociedade' }]]);
        const { blocos, semCabecalho } = lerListaPorDestino(
            'Antes; Sociedade: Machismo; Luto: perda\nSOCIEDADE: Polarização',
            destinos,
        );
        assert.deepEqual(semCabecalho, ['Antes']);
        assert.equal(blocos.length, 1);
        assert.deepEqual(blocos[0].nomes, ['Machismo', 'Luto: perda', 'Polarização']);
    });
});

describe('planejarLista por assunto', () => {
    it('separa o que entra do que já estava e não grava nada', () => {
        const db = montar();
        const p = planejarLista(db, 'assunto', 'Sociedade: Machismo; polarizacao');
        assert.equal(p.ok, true);
        assert.deepEqual(
            p.aplicaveis.map((a) => [a.nome, a.destino, a.muda]),
            [
                ['Machismo', 'Sociedade', false],
                ['Polarização', 'Sociedade', true],
            ],
        );
        assert.deepEqual(p.resumo, [
            { destinoId: 10, destino: 'Sociedade', encontrados: 2, mudam: 1 },
        ]);
        assert.deepEqual(db.assuntos[0].temaIds, [1]);
    });

    it('um tema pode ir para dois assuntos na mesma lista', () => {
        const p = planejarLista(
            montar(),
            'assunto',
            'Sociedade: Polarização\nVínculos e relações: Polarização; Saudade',
        );
        assert.equal(p.aplicaveis.length, 3);
        assert.equal(p.resumo.length, 2);
    });

    it('lista temas inexistentes sem criar nada e tema repetido no mesmo assunto conta uma vez', () => {
        const db = montar();
        const p = planejarLista(db, 'assunto', 'Sociedade: Inventado; Machismo; machismo');
        assert.deepEqual(p.inexistentes, [{ nome: 'Inventado', destino: 'Sociedade' }]);
        assert.equal(p.aplicaveis.length, 1);
        assert.equal(db.temas.length, 5);
    });

    it('nomes antes do primeiro cabeçalho ficam de fora', () => {
        const p = planejarLista(montar(), 'assunto', 'Saudade; Sociedade: Polarização');
        assert.deepEqual(p.semCabecalho, ['Saudade']);
        assert.equal(p.aplicaveis.length, 1);
    });

    it('recusa lista vazia, sem cabeçalho e cadastro sem assuntos', () => {
        assert.equal(planejarLista(montar(), 'assunto', '  ').motivo, 'vazio');
        assert.equal(planejarLista(montar(), 'assunto', 'Machismo').motivo, 'sem-cabecalho');
        assert.equal(
            planejarLista(montar(), 'assunto', 'Agradável: Machismo').motivo,
            'sem-cabecalho',
        );
        const db = montar();
        db.assuntos = [];
        assert.equal(planejarLista(db, 'assunto', 'Sociedade: Machismo').motivo, 'sem-destinos');
    });
});

describe('aplicarLista por assunto', () => {
    it('acrescenta sem repetir, conta as ligações novas e desfaz', () => {
        const db = montar();
        const r = aplicarLista(
            db,
            'assunto',
            'Sociedade: Machismo; Polarização\nVínculos e relações: Saudade',
        );
        assert.equal(r.ok, true);
        assert.equal(r.alterados, 2);
        assert.equal(r.iguais, 1);
        assert.deepEqual(db.assuntos[0].temaIds, [1, 2]);
        assert.deepEqual(db.assuntos[1].temaIds, [5]);
        r.desfazer();
        assert.deepEqual(db.assuntos[0].temaIds, [1]);
        assert.deepEqual(db.assuntos[1].temaIds, []);
    });

    it('nunca tira um tema de onde está nem mexe na valência', () => {
        const db = montar();
        aplicarLista(db, 'assunto', 'Vínculos e relações: Machismo; Saudade');
        assert.deepEqual(db.assuntos[0].temaIds, [1]);
        assert.equal(db.temas[4].valencia, 'desagradavel');
    });

    it('sem tema aplicável não grava e avisa', () => {
        const db = montar();
        const r = aplicarLista(db, 'assunto', 'Sociedade: Inventado');
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'sem-temas');
        assert.equal(r.inexistentes.length, 1);
    });
});

describe('lista por vitrine', () => {
    it('acrescenta aos convites pelo nome, com vírgula no nome do tema, e desfaz', () => {
        const db = montar();
        const r = aplicarLista(
            db,
            'vitrine',
            'Quando o amor acaba: Amor, perda; Saudade\ncidade: Luto: perda',
        );
        assert.equal(r.ok, true);
        assert.equal(r.alterados, 2);
        assert.equal(r.iguais, 1);
        assert.deepEqual(db.temasUniversais[0].temaIds, [4, 5]);
        assert.deepEqual(db.temasUniversais[1].temaIds, [3]);
        r.desfazer();
        assert.deepEqual(db.temasUniversais[0].temaIds, [4]);
        assert.deepEqual(db.temasUniversais[1].temaIds, []);
    });

    it('sem convites cadastrados, avisa e não cria o array no db', () => {
        const db = montar();
        delete db.temasUniversais;
        assert.equal(planejarLista(db, 'vitrine', 'Cidade: Machismo').motivo, 'sem-destinos');
        assert.equal(db.temasUniversais, undefined);
    });

    it('um nome de assunto não vale como cabeçalho da vitrine', () => {
        assert.equal(
            planejarLista(montar(), 'vitrine', 'Sociedade: Machismo').motivo,
            'sem-cabecalho',
        );
    });
});

describe('valência continua como era', () => {
    it('campo valencia (ou vazio) usa a lista de valência', () => {
        const db = montar();
        const p = planejarLista(db, 'valencia', 'Agradável: Machismo');
        assert.equal(p.ok, true);
        assert.equal(p.aplicaveis[0].valencia, 'agradavel');
        assert.equal(planejarLista(db, undefined, 'Agradável: Machismo').ok, true);
        const r = aplicarLista(db, 'valencia', 'Agradável: Machismo');
        assert.equal(r.alterados, 1);
        assert.equal(db.temas[0].valencia, 'agradavel');
    });
});
