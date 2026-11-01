import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { montarForaDoAcervo } from '../js/fora-do-acervo.js';
import { criarDataObra } from '../js/data-da-obra.js';
import {
    aplicarPlano,
    MENSAGENS_ERRO_CORRECAO,
    planejarCorrecao,
} from '../js/corrigir-fora-do-acervo.js';

// Data da obra (entrega 5): o "Corrigir obra" mantém, troca ou tira a data.

// Datas como o app as grava (com `de` e `ate`).
const ano = (n, extra = {}) => criarDataObra({ nivel: 'ano', ano: n, ...extra }).data;
const CHAVE = 'aguas de marco|tom jobim';

let poemas;
let prosas;

beforeEach(() => {
    poemas = [
        {
            id: 1,
            titulo: 'Águas',
            texto: 'não mexer',
            intertextualidade: [
                {
                    tipoObra: 'Música',
                    obra: 'Águas de Março',
                    autores: ['Tom Jobim'],
                    dataObra: ano(1972),
                },
            ],
        },
        {
            id: 2,
            titulo: 'Outro',
            intertextualidade: [
                { tipoObra: 'Música', obra: 'águas de março', autores: ['tom jobim'] },
            ],
            hipertextualidade: [
                {
                    tipoObra: 'Música',
                    hipotexto: 'Águas de Março',
                    autores: ['Tom Jobim'],
                    dataObra: ano(1973),
                    dataObraAte: ano(1975),
                },
            ],
        },
    ];
    prosas = [
        {
            id: 7,
            titulo: 'Conto',
            intertextualidade: [{ obra: 'Outra coisa', autores: ['Fulano'], dataObra: ano(1900) }],
        },
    ];
});

const entrada = () => ({ poemas, prosas });
const nova = (extra = {}) => ({ obra: 'Águas de Março', autores: ['Tom Jobim'], ...extra });
const pedido = (extra) => ({ tipo: 'obra', alvos: [CHAVE], novo: nova(extra) });

describe('o índice acha a obra antes da correção', () => {
    it('a chave usada nos testes é a da obra', () => {
        const { obras } = montarForaDoAcervo(entrada());
        assert.ok(obras.some((o) => o.chave === CHAVE));
    });
});

describe('Corrigir obra: data ausente mantém o que já existe', () => {
    it('pedido sem data não toca nas datas e a contagem não muda', () => {
        const plano = planejarCorrecao(entrada(), pedido({ obra: 'Águas de Março (1972)' }));
        assert.equal(plano.entradas, 3);
        assert.equal(plano.datasSobrescritas, 0);
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].dataObra.ano, 1972);
        assert.ok(!('dataObra' in poemas[1].intertextualidade[0]));
        assert.equal(poemas[1].hipertextualidade[0].dataObraAte.ano, 1975);
    });

    it('sem nada a mudar, as entradas contam como já iguais', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido({ tipoObra: 'Música', obra: 'Águas de Março' }),
        );
        assert.equal(plano.erro, '');
        assert.ok(plano.jaIguais >= 1);
    });
});

describe('Corrigir obra: trocar a data', () => {
    it('grava a mesma data, normalizada, em todos os usos da obra', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido({ dataObra: { nivel: 'ano', ano: '1972' }, dataObraAte: null }),
        );
        assert.equal(plano.erro, '');
        aplicarPlano(plano);
        for (const e of [
            poemas[0].intertextualidade[0],
            poemas[1].intertextualidade[0],
            poemas[1].hipertextualidade[0],
        ]) {
            assert.equal(e.dataObra.ano, 1972);
            assert.equal(e.dataObra.de, 1972);
            assert.ok(!('dataObraAte' in e), 'o fim foi tirado');
        }
        assert.equal(prosas[0].intertextualidade[0].dataObra.ano, 1900, 'outra obra intacta');
    });

    it('conta quantas entradas perdem uma data diferente da nova', () => {
        const plano = planejarCorrecao(entrada(), pedido({ dataObra: ano(1972) }));
        // A 1 já tem 1972 (igual, não conta); a 2 não tem data (não perde nada);
        // a hiper tem 1973 (perde).
        assert.equal(plano.datasSobrescritas, 1);
    });

    it('só a ponta pedida muda', () => {
        const plano = planejarCorrecao(entrada(), pedido({ dataObraAte: ano(1980) }));
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].dataObra.ano, 1972, 'começo intacto');
        assert.equal(poemas[0].intertextualidade[0].dataObraAte.ano, 1980);
        assert.equal(poemas[1].hipertextualidade[0].dataObra.ano, 1973);
        assert.equal(poemas[1].hipertextualidade[0].dataObraAte.ano, 1980);
    });

    it('aceita a.C., século e aprox.', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido({
                dataObra: { nivel: 'seculo', seculo: 'V', aC: true, aprox: true },
            }),
        );
        aplicarPlano(plano);
        const d = poemas[0].intertextualidade[0].dataObra;
        assert.deepEqual(
            [d.nivel, d.seculo, d.aC, d.aprox, d.de, d.ate],
            ['seculo', 5, true, true, -500, -401],
        );
    });

    it('a data nova junto com outras correções vale numa passada só', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido({
                obra: 'Águas de Março (canção)',
                descricao: 'canção de 1972',
                dataObra: ano(1972),
            }),
        );
        aplicarPlano(plano);
        const e = poemas[1].intertextualidade[0];
        assert.equal(e.obra, 'Águas de Março (canção)');
        assert.equal(e.descricao, 'canção de 1972');
        assert.equal(e.dataObra.ano, 1972);
    });
});

describe('Corrigir obra: tirar a data', () => {
    it('null tira a chave de todas as entradas da obra', () => {
        const plano = planejarCorrecao(entrada(), pedido({ dataObra: null, dataObraAte: null }));
        assert.equal(plano.datasSobrescritas, 2, 'a 1 e a hiper perdem a data');
        aplicarPlano(plano);
        for (const e of [poemas[0].intertextualidade[0], poemas[1].hipertextualidade[0]]) {
            assert.ok(!('dataObra' in e));
            assert.ok(!('dataObraAte' in e));
        }
    });

    it('entrada que já não tem data não ganha chave nenhuma', () => {
        aplicarPlano(planejarCorrecao(entrada(), pedido({ dataObra: null, dataObraAte: null })));
        assert.ok(!('dataObra' in poemas[1].intertextualidade[0]));
    });

    it('tira também uma chave que guardava lixo, sem travar a correção', () => {
        poemas[1].intertextualidade[0].dataObra = 'lixo';
        const plano = planejarCorrecao(entrada(), pedido({ dataObra: null }));
        aplicarPlano(plano);
        assert.ok(!('dataObra' in poemas[1].intertextualidade[0]));
    });

    it('pedido sem data não mexe numa chave que guardava lixo', () => {
        poemas[1].intertextualidade[0].dataObra = 'lixo';
        aplicarPlano(planejarCorrecao(entrada(), pedido({ obra: 'Águas de Março (canção)' })));
        assert.equal(poemas[1].intertextualidade[0].dataObra, 'lixo');
    });
});

describe('Corrigir obra: recusas da data', () => {
    it('data que não vale é recusada com o código do problema e nada muda', () => {
        const antes = JSON.stringify({ poemas, prosas });
        const plano = planejarCorrecao(entrada(), pedido({ dataObra: { nivel: 'ano', ano: 0 } }));
        assert.equal(plano.erro, 'data-invalida');
        assert.equal(plano.erroData, 'ano-invalido');
        assert.deepEqual(plano.alteracoes, []);
        assert.equal(plano.datasSobrescritas, 0);
        aplicarPlano(plano);
        assert.equal(JSON.stringify({ poemas, prosas }), antes);

        const fim = planejarCorrecao(
            entrada(),
            pedido({ dataObraAte: { nivel: 'mes', ano: 1900 } }),
        );
        assert.equal(fim.erro, 'data-invalida');
        assert.equal(fim.erroData, 'mes-invalido');
    });

    it('fim antes do começo é recusado', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido({ dataObra: ano(1980), dataObraAte: ano(1970) }),
        );
        assert.equal(plano.erro, 'data-fim-antes-do-inicio');
        assert.deepEqual(plano.alteracoes, []);
    });

    it('com uma ponta só, confere com a ponta que a entrada já tem', () => {
        // A hiper tem 1973 a 1975: um novo fim de 1960 viraria fim antes do começo.
        const plano = planejarCorrecao(entrada(), pedido({ dataObraAte: ano(1960) }));
        assert.equal(plano.erro, 'data-fim-antes-do-inicio');
    });

    it('uma entrada antiga com as pontas trocadas não trava uma correção sem data', () => {
        poemas[1].hipertextualidade[0].dataObra = ano(1990);
        poemas[1].hipertextualidade[0].dataObraAte = ano(1950);
        const plano = planejarCorrecao(entrada(), pedido({ obra: 'Águas de Março (canção)' }));
        assert.equal(plano.erro, '');
    });

    it('as duas mensagens novas existem e não têm travessão', () => {
        for (const c of ['data-invalida', 'data-fim-antes-do-inicio']) {
            assert.ok(MENSAGENS_ERRO_CORRECAO[c]);
            assert.ok(!/[—–]/.test(MENSAGENS_ERRO_CORRECAO[c]));
        }
    });
});

describe('Corrigir obra: Desfazer da data', () => {
    it('devolve valores, tira chaves que não existiam e devolve as que foram tiradas', () => {
        const antes = JSON.stringify({ poemas, prosas });
        const plano = planejarCorrecao(
            entrada(),
            pedido({ dataObra: ano(1900, { aprox: true }), dataObraAte: ano(1910) }),
        );
        const resultado = aplicarPlano(plano);
        assert.notEqual(JSON.stringify({ poemas, prosas }), antes);
        resultado.desfazer();
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
        resultado.desfazer();
        assert.equal(JSON.stringify({ poemas, prosas }), antes, 'desfazer duas vezes não estraga');
    });

    it('desfaz também a retirada da data', () => {
        const antes = JSON.stringify({ poemas, prosas });
        const resultado = aplicarPlano(
            planejarCorrecao(entrada(), pedido({ dataObra: null, dataObraAte: null })),
        );
        resultado.desfazer();
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
    });

    it('a ordem das chaves não importa, mas o conteúdo volta idêntico com a data junto do resto', () => {
        const antes = JSON.stringify({ poemas, prosas });
        const resultado = aplicarPlano(
            planejarCorrecao(
                entrada(),
                pedido({
                    obra: 'Outro nome',
                    autores: ['Elis Regina', 'Tom Jobim'],
                    tipoObra: 'Livro',
                    descricao: 'nova',
                    dataObra: ano(2000),
                }),
            ),
        );
        resultado.desfazer();
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
    });
});

describe('Corrigir autor não mexe na data', () => {
    it('trocar a tag de um autor preserva as datas da obra', () => {
        const plano = planejarCorrecao(entrada(), {
            tipo: 'autor',
            alvos: ['tom jobim'],
            novo: { autor: 'Antônio Carlos Jobim' },
        });
        aplicarPlano(plano);
        const e = poemas[0].intertextualidade[0];
        assert.deepEqual(e.autores, ['Antônio Carlos Jobim']);
        assert.equal(e.dataObra.ano, 1972);
        assert.equal(poemas[1].hipertextualidade[0].dataObraAte.ano, 1975);
    });
});
