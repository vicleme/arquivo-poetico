import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { montarForaDoAcervo, estadoObraPessoal } from '../js/fora-do-acervo.js';
import { planejarCorrecao, aplicarPlano, descreverPlano } from '../js/corrigir-fora-do-acervo.js';

// Obra pessoal (entrega 2): o resumo da marca por obra em Fora do acervo e a
// correção em lote ("Corrigir obra") que marca ou desmarca todas as entradas.

const CHAVE = 'diario de bordo|';

// "Diário de bordo" em três entradas: marcada num Poema (Inter), não marcada
// noutro Poema (Inter) e marcada numa Prosa (Hiper).
function cenario() {
    return {
        poemas: [
            {
                id: 1,
                titulo: 'A',
                intertextualidade: [{ obra: 'Diario de bordo', obraPessoal: true }],
            },
            { id: 2, titulo: 'B', intertextualidade: [{ obra: 'Diario de bordo' }] },
        ],
        prosas: [
            {
                id: 3,
                titulo: 'C',
                hipertextualidade: [{ hipotexto: 'Diario de bordo', obraPessoal: true }],
            },
        ],
    };
}

const obraDe = (entrada) => montarForaDoAcervo(entrada).obras.find((o) => o.chave === CHAVE);
const pedido = (extra = {}) => ({
    tipo: 'obra',
    alvos: [CHAVE],
    novo: { obra: 'Diario de bordo', autores: [], ...extra },
});

describe('estadoObraPessoal e o resumo da obra', () => {
    it('todas, algumas ou nenhuma', () => {
        assert.equal(estadoObraPessoal(0, 0), 'nenhuma');
        assert.equal(estadoObraPessoal(0, 3), 'nenhuma');
        assert.equal(estadoObraPessoal(1, 3), 'algumas');
        assert.equal(estadoObraPessoal(3, 3), 'todas');
    });

    it('a obra traz a contagem das entradas (Inter e Hiper) e o estado', () => {
        const o = obraDe(cenario());
        assert.equal(o.entradasTotal, 3);
        assert.equal(o.entradasPessoais, 2);
        assert.equal(o.obraPessoal, 'algumas');
    });

    it('marcada em todas vale "todas"; sem nenhuma, "nenhuma"', () => {
        const e = cenario();
        e.poemas[1].intertextualidade[0].obraPessoal = true;
        assert.equal(obraDe(e).obraPessoal, 'todas');
        const sem = {
            poemas: [{ id: 1, titulo: 'A', intertextualidade: [{ obra: 'Diario de bordo' }] }],
            prosas: [],
        };
        assert.equal(obraDe(sem).obraPessoal, 'nenhuma');
    });
});

describe('Corrigir obra: marca de obra pessoal', () => {
    it('true marca todas; o plano conta só as que mudam; nome e descrição não são tocados', () => {
        const e = cenario();
        const plano = planejarCorrecao(e, pedido({ obraPessoal: true }));
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 1);
        assert.equal(plano.marcasMudadas, 1);
        aplicarPlano(plano);
        assert.equal(e.poemas[1].intertextualidade[0].obraPessoal, true);
        assert.equal(e.poemas[1].intertextualidade[0].obra, 'Diario de bordo');
        assert.equal('descricao' in e.poemas[1].intertextualidade[0], false);
        assert.equal(obraDe(e).obraPessoal, 'todas');
    });

    it('false tira a marca de todas (a chave sai), e o Desfazer devolve só as que tinham', () => {
        const e = cenario();
        const feito = aplicarPlano(planejarCorrecao(e, pedido({ obraPessoal: false })));
        assert.equal(feito.entradas, 2);
        assert.equal('obraPessoal' in e.poemas[0].intertextualidade[0], false);
        assert.equal('obraPessoal' in e.prosas[0].hipertextualidade[0], false);
        assert.equal(obraDe(e).obraPessoal, 'nenhuma');
        feito.desfazer();
        assert.equal(e.poemas[0].intertextualidade[0].obraPessoal, true);
        assert.equal(e.prosas[0].hipertextualidade[0].obraPessoal, true);
        assert.equal('obraPessoal' in e.poemas[1].intertextualidade[0], false);
    });

    it('desfazer de "marcar todas" tira a marca de quem não tinha', () => {
        const e = cenario();
        const feito = aplicarPlano(planejarCorrecao(e, pedido({ obraPessoal: true })));
        feito.desfazer();
        assert.equal('obraPessoal' in e.poemas[1].intertextualidade[0], false);
        assert.equal(e.poemas[0].intertextualidade[0].obraPessoal, true);
    });

    it('sem obraPessoal no pedido, cada entrada mantém a sua marca', () => {
        const e = cenario();
        const plano = planejarCorrecao(e, pedido({ obra: 'Diário de bordo' }));
        assert.equal(plano.marcasMudadas, 0);
        aplicarPlano(plano);
        assert.equal(e.poemas[0].intertextualidade[0].obraPessoal, true);
        assert.equal('obraPessoal' in e.poemas[1].intertextualidade[0], false);
        assert.equal(e.prosas[0].hipertextualidade[0].obraPessoal, true);
    });

    it('já está assim: nada a alterar', () => {
        const e = cenario();
        e.poemas[1].intertextualidade[0].obraPessoal = true;
        const plano = planejarCorrecao(e, pedido({ obraPessoal: true }));
        assert.equal(plano.entradas, 0);
        assert.equal(plano.jaIguais, 3);
    });

    it('valor que não é booleano não conta como pedido', () => {
        const e = cenario();
        const plano = planejarCorrecao(e, pedido({ obraPessoal: 'true' }));
        assert.equal(plano.entradas, 0);
    });

    it('uma marca antiga guardada como false volta como estava no Desfazer', () => {
        const e = cenario();
        e.poemas[1].intertextualidade[0].obraPessoal = false;
        const feito = aplicarPlano(planejarCorrecao(e, pedido({ obraPessoal: true })));
        assert.equal(e.poemas[1].intertextualidade[0].obraPessoal, true);
        feito.desfazer();
        assert.equal(e.poemas[1].intertextualidade[0].obraPessoal, false);
    });

    it('a frase da confirmação diz que a obra passa a ser (ou deixa de ser) pessoal', () => {
        const e = cenario();
        const marcar = descreverPlano(planejarCorrecao(e, pedido({ obraPessoal: true })));
        assert.match(marcar.linhas.join(' '), /passa a ser obra pessoal/);
        const tirar = descreverPlano(planejarCorrecao(e, pedido({ obraPessoal: false })));
        assert.match(tirar.linhas.join(' '), /deixa de ser obra pessoal/);
    });

    it('combina com renomear: nome novo e marca em todas, de uma vez', () => {
        const e = cenario();
        aplicarPlano(planejarCorrecao(e, pedido({ obra: 'Diário', obraPessoal: true })));
        const nomes = [
            e.poemas[0].intertextualidade[0].obra,
            e.poemas[1].intertextualidade[0].obra,
            e.prosas[0].hipertextualidade[0].hipotexto,
        ];
        assert.deepEqual(nomes, ['Diário', 'Diário', 'Diário']);
        assert.equal(e.poemas[1].intertextualidade[0].obraPessoal, true);
    });
});
