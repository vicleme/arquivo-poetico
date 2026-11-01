import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { montarForaDoAcervo } from '../js/fora-do-acervo.js';
import { criarDataObra, datasDaEntrada } from '../js/data-da-obra.js';
import {
    aplicarPlano,
    chaveDaReferencia,
    descreverPlano,
    MENSAGENS_ERRO_CORRECAO,
    planejarCorrecao,
} from '../js/corrigir-fora-do-acervo.js';

// Corrigir referência (entrega 1 de 2): renomear, trocar o tipo e mexer na data
// das Referências em todos os textos, com aviso ao deixar de ser Pessoa pública.

const ano = (n) => criarDataObra({ nivel: 'ano', ano: n }).data;
const PP = 'Pessoa pública';
const CHAVE_MARX = 'pessoa publica|karl marx';
const CHAVE_MARX_CURTO = 'pessoa publica|marx';

let poemas;
let prosas;

beforeEach(() => {
    poemas = [
        {
            id: 1,
            titulo: 'Capital',
            texto: 'não mexer',
            referenciasExternas: [
                {
                    tipo: PP,
                    texto: 'Karl Marx',
                    dataObra: ano(1818),
                    conhecidoComo: ['Filósofo(a)'],
                    genero: 'Homem',
                    orientacao: 'Hétero',
                    corRaca: 'Branca',
                    nota: 'fica',
                },
            ],
            intertextualidade: [
                { tipoObra: 'Livro', obra: 'Karl Marx', autores: ['Outro'], relacao: 'Citação' },
            ],
        },
        {
            id: 2,
            titulo: 'Greve',
            referenciasExternas: [
                { tipo: PP, texto: 'marx' },
                { tipo: 'Notícia', texto: 'Karl Marx' },
            ],
        },
    ];
    prosas = [
        {
            id: 7,
            titulo: 'Conto',
            referenciasExternas: [{ tipo: PP, texto: 'Karl Marx', genero: 'Homem' }],
        },
    ];
});

const entrada = () => ({ poemas, prosas });
const pedido = (alvos, novo) => ({ tipo: 'referencia', alvos, novo });

describe('chave da referência', () => {
    it('é a mesma chave que a lista de Referências usa', () => {
        const chaves = new Set(montarForaDoAcervo(entrada()).referencias.map((r) => r.chave));
        assert.ok(chaves.has(chaveDaReferencia(poemas[0].referenciasExternas[0])));
        assert.ok(chaves.has(chaveDaReferencia(poemas[1].referenciasExternas[1])));
    });

    it('entrada sem texto não tem chave', () => {
        assert.equal(chaveDaReferencia({ tipo: PP, texto: ' ' }), '');
    });
});

describe('corrigir uma referência', () => {
    it('renomeia em todos os textos e mexe só nas Referências do alvo', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], { texto: 'Karl Heinrich Marx' }),
        );
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 2);
        assert.equal(plano.textos, 2);
        aplicarPlano(plano);
        assert.equal(poemas[0].referenciasExternas[0].texto, 'Karl Heinrich Marx');
        assert.equal(prosas[0].referenciasExternas[0].texto, 'Karl Heinrich Marx');
        assert.equal(poemas[1].referenciasExternas[0].texto, 'marx');
        assert.equal(poemas[1].referenciasExternas[1].texto, 'Karl Marx');
        assert.equal(poemas[0].intertextualidade[0].obra, 'Karl Marx');
        assert.equal(poemas[0].texto, 'não mexer');
    });

    it('juntar grafias: conta os textos que já tinham o resultado', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX_CURTO], { texto: 'Karl Marx' }),
        );
        assert.equal(plano.entradas, 1);
        assert.equal(plano.juntaCom, 2);
        aplicarPlano(plano);
        assert.equal(poemas[1].referenciasExternas[0].texto, 'Karl Marx');
    });

    it('os campos de Pessoa pública ficam como estão quando o tipo continua', () => {
        aplicarPlano(planejarCorrecao(entrada(), pedido([CHAVE_MARX], { texto: 'Marx, Karl' })));
        const e = poemas[0].referenciasExternas[0];
        assert.deepEqual(e.conhecidoComo, ['Filósofo(a)']);
        assert.equal(e.genero, 'Homem');
        assert.equal(e.orientacao, 'Hétero');
        assert.equal(e.corRaca, 'Branca');
        assert.equal(e.nota, 'fica');
    });

    it('sem `tipo` no pedido, cada entrada mantém o seu', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX, 'noticia|karl marx'], { texto: 'K. Marx' }),
        );
        aplicarPlano(plano);
        assert.equal(poemas[1].referenciasExternas[1].tipo, 'Notícia');
        assert.equal(poemas[1].referenciasExternas[1].texto, 'K. Marx');
        assert.equal(poemas[0].referenciasExternas[0].tipo, PP);
    });

    it('já estar assim não é mudança', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], { texto: 'Karl Marx', tipo: PP }),
        );
        assert.equal(plano.entradas, 0);
        assert.equal(plano.jaIguais, 2);
    });

    it('nome vazio e pedido sem alvo são recusados', () => {
        assert.equal(
            planejarCorrecao(entrada(), pedido([CHAVE_MARX], { texto: ' ' })).erro,
            'referencia-vazia',
        );
        assert.equal(planejarCorrecao(entrada(), pedido([], { texto: 'X' })).erro, 'sem-alvo');
        assert.ok(MENSAGENS_ERRO_CORRECAO['referencia-vazia']);
    });
});

describe('trocar o tipo da referência', () => {
    it('deixar de ser Pessoa pública apaga os campos dela e conta as entradas', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], { texto: 'Karl Marx', tipo: 'Marco histórico' }),
        );
        assert.equal(plano.tiposMudados, 2);
        assert.equal(plano.caracterizacoesPerdidas, 2);
        aplicarPlano(plano);
        const e = poemas[0].referenciasExternas[0];
        assert.equal(e.tipo, 'Marco histórico');
        ['conhecidoComo', 'genero', 'orientacao', 'corRaca'].forEach((k) =>
            assert.equal(k in e, false),
        );
        assert.equal(e.nota, 'fica');
        assert.equal('genero' in prosas[0].referenciasExternas[0], false);
    });

    it('entrada de Pessoa pública sem campos preenchidos não conta como perda', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX_CURTO], { texto: 'marx', tipo: 'Outro' }),
        );
        assert.equal(plano.entradas, 1);
        assert.equal(plano.caracterizacoesPerdidas, 0);
    });

    it('o Desfazer devolve tipo, texto e os campos de Pessoa pública', () => {
        const antes = structuredClone(poemas[0].referenciasExternas[0]);
        const feito = aplicarPlano(
            planejarCorrecao(entrada(), pedido([CHAVE_MARX], { texto: 'K', tipo: 'Notícia' })),
        );
        feito.desfazer();
        assert.deepEqual(poemas[0].referenciasExternas[0], antes);
        assert.equal(prosas[0].referenciasExternas[0].genero, 'Homem');
    });

    it('passar a ser Pessoa pública não cria campo nenhum', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido(['noticia|karl marx'], { texto: 'Karl Marx', tipo: PP }),
        );
        assert.equal(plano.caracterizacoesPerdidas, 0);
        aplicarPlano(plano);
        assert.deepEqual(Object.keys(poemas[1].referenciasExternas[1]).sort(), ['texto', 'tipo']);
    });

    it('tipo vazio tira o tipo', () => {
        aplicarPlano(
            planejarCorrecao(entrada(), pedido([CHAVE_MARX_CURTO], { texto: 'marx', tipo: '' })),
        );
        assert.equal(poemas[1].referenciasExternas[0].tipo, '');
    });
});

describe('data da referência', () => {
    it('troca, tira e mantém a data conforme o pedido', () => {
        const troca = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], { texto: 'Karl Marx', dataObra: ano(1820) }),
        );
        assert.equal(troca.datasSobrescritas, 1);
        aplicarPlano(troca);
        assert.equal(datasDaEntrada(poemas[0].referenciasExternas[0]).inicio.ano, 1820);
        assert.equal(datasDaEntrada(prosas[0].referenciasExternas[0]).inicio.ano, 1820);

        aplicarPlano(
            planejarCorrecao(
                entrada(),
                pedido([CHAVE_MARX], { texto: 'Karl Marx', dataObra: null }),
            ),
        );
        assert.equal('dataObra' in poemas[0].referenciasExternas[0], false);
    });

    it('o Desfazer devolve a data de antes', () => {
        const feito = aplicarPlano(
            planejarCorrecao(
                entrada(),
                pedido([CHAVE_MARX], { texto: 'Karl Marx', dataObra: ano(1900) }),
            ),
        );
        feito.desfazer();
        assert.equal(datasDaEntrada(poemas[0].referenciasExternas[0]).inicio.ano, 1818);
        assert.equal('dataObra' in prosas[0].referenciasExternas[0], false);
    });

    it('data que não vale e fim antes do começo são recusados', () => {
        const ruim = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], { texto: 'Karl Marx', dataObra: { nivel: 'ano', ano: 0 } }),
        );
        assert.equal(ruim.erro, 'data-invalida');
        const fim = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], {
                texto: 'Karl Marx',
                dataObra: ano(1900),
                dataObraAte: ano(1800),
            }),
        );
        assert.equal(fim.erro, 'data-fim-antes-do-inicio');
    });
});

describe('descrição do plano de referência', () => {
    it('mostra nome e tipo antes e depois', () => {
        const plano = planejarCorrecao(
            entrada(),
            pedido([CHAVE_MARX], { texto: 'Karl Marx', tipo: 'Marco histórico' }),
        );
        const { linhas } = descreverPlano(plano);
        assert.deepEqual(linhas, ['«Karl Marx» (Pessoa pública) → «Karl Marx» (Marco histórico)']);
    });
});
