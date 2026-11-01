import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mapa de calor das origens, entrega 1: a junção entre a contagem por origem
// (`agregarTextosPorOrigem`) e os países do mapa.

import { montarDadosDoMapa } from '../js/mapa-origens.js';

const { db } = await import('../js/db.js');
const { agregarTextosPorOrigem } = await import('../js/estatisticas-dados-data-obra.js');

const ref = (id, tipo = 'poema') => ({ tipo, id });
const item = (rotulo, ...ids) => ({ rotulo, chave: rotulo.toLowerCase(), ids, textos: ids.length });

describe('montarDadosDoMapa: com dados escritos à mão', () => {
    it('separa países, desconhecida e o que não tem lugar no mapa', () => {
        const dados = montarDadosDoMapa({
            itens: [
                item('Grécia', ref(1), ref(2), ref(3)),
                item('Brasil', ref(4)),
                item('Desconhecida', ref(5), ref(6)),
                item('Roma Antiga', ref(7)),
                item('Celta', ref(8), ref(9)),
            ],
            comEntradas: 10,
            comOrigem: 9,
            semOrigem: 1,
        });
        assert.deepEqual(
            dados.paises.map((p) => [p.codigo, p.nome, p.textos]),
            [
                ['300', 'Grécia', 3],
                ['076', 'Brasil', 1],
            ],
        );
        assert.equal(dados.maximo, 3);
        assert.equal(dados.textosNoMapa, 4);
        assert.equal(dados.desconhecida.textos, 2);
        assert.deepEqual(
            dados.semLugar.map((s) => [s.rotulo, s.textos]),
            [
                ['Celta', 2],
                ['Roma Antiga', 1],
            ],
        );
        assert.equal(dados.comEntradas, 10);
        assert.equal(dados.comOrigem, 9);
        assert.equal(dados.semOrigem, 1);
    });

    it('etiquetas do mesmo país somam por TEXTO, sem contar o mesmo texto duas vezes', () => {
        const dados = montarDadosDoMapa({
            itens: [
                item('Inglaterra', ref(1), ref(2)),
                item('Reino Unido', ref(2), ref(3)),
                item('Escócia', ref(4)),
            ],
        });
        assert.equal(dados.paises.length, 1);
        const [uk] = dados.paises;
        assert.equal(uk.codigo, '826');
        assert.equal(uk.textos, 4); // 1, 2, 3 e 4: o 2 uma vez só
        assert.deepEqual(uk.rotulos, ['Inglaterra', 'Reino Unido', 'Escócia']);
        assert.deepEqual(
            uk.ids.map((r) => r.id),
            [1, 2, 3, 4],
        );
    });

    it('um poema e uma prosa com o mesmo id são textos diferentes', () => {
        const dados = montarDadosDoMapa({
            itens: [item('França', ref(1, 'poema'), ref(1, 'prosa'))],
        });
        assert.equal(dados.paises[0].textos, 2);
    });

    it('empate de contagem desempata pelo nome, em português', () => {
        const dados = montarDadosDoMapa({
            itens: [item('Portugal', ref(1)), item('Alemanha', ref(2)), item('Índia', ref(3))],
        });
        assert.deepEqual(
            dados.paises.map((p) => p.nome),
            ['Alemanha', 'Índia', 'Portugal'],
        );
    });

    it('sem nada, devolve tudo zerado e sem estourar', () => {
        [undefined, null, {}, { itens: [] }].forEach((entrada) => {
            const dados = montarDadosDoMapa(entrada);
            assert.deepEqual(dados.paises, []);
            assert.deepEqual(dados.semLugar, []);
            assert.equal(dados.maximo, 0);
            assert.equal(dados.textosNoMapa, 0);
            assert.equal(dados.desconhecida.textos, 0);
            assert.equal(dados.comEntradas, 0);
        });
    });
});

describe('montarDadosDoMapa: com a contagem real das Estatísticas', () => {
    beforeEach(() => {
        [
            'pessoas',
            'grupos',
            'autores',
            'livros',
            'epocas',
            'periodosHistoricos',
            'movimentosEscolas',
            'temas',
            'assuntos',
            'prosas',
        ].forEach((c) => {
            db[c] = [];
        });
        const obra = (obra, origemObra) => ({
            tipoObra: 'Mito',
            obra,
            ...(origemObra ? { origemObra } : {}),
        });
        db.poemas = [
            { id: 1, titulo: 'A', intertextualidade: [obra('Prometeu', ['Grécia'])] },
            {
                id: 2,
                titulo: 'B',
                intertextualidade: [obra('Prometeu', ['grécia', 'Roma Antiga'])],
            },
            { id: 3, titulo: 'C', intertextualidade: [obra('Ditado', ['Desconhecida'])] },
            {
                id: 4,
                titulo: 'D',
                intertextualidade: [obra('Saci', ['Brasil']), obra('X', ['EUA'])],
            },
            { id: 5, titulo: 'E', intertextualidade: [obra('Sem origem')] },
        ];
    });

    it('lê as origens digitadas do acervo e monta o mapa', () => {
        const dados = montarDadosDoMapa(agregarTextosPorOrigem(db.poemas));
        assert.deepEqual(
            dados.paises.map((p) => [p.nome, p.textos]),
            [
                ['Grécia', 2],
                ['Brasil', 1],
                ['Estados Unidos', 1],
            ],
        );
        assert.equal(dados.desconhecida.textos, 1);
        assert.deepEqual(
            dados.semLugar.map((s) => s.rotulo),
            ['Roma Antiga'],
        );
        assert.equal(dados.comEntradas, 5);
        assert.equal(dados.comOrigem, 4);
        assert.equal(dados.semOrigem, 1);
        assert.equal(dados.maximo, 2);
    });
});
