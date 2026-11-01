import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    listarLinhasRevisao,
    filtrarLinhasRevisao,
    planejarRevisao,
    aplicarRevisao,
    descreverRevisao,
    MENSAGENS_ERRO_REVISAO,
    ROTULOS_VALOR_REVISAO,
    VALORES_DATA_OBRA,
    VALORES_REVISAO,
    valorAplica,
} from '../js/revisao-fora-do-acervo.js';
import { criarDataObra, formatarDataObra, lerDataObra } from '../js/data-da-obra.js';

// Modo revisão, T9 entrega 7: as colunas "Data da obra" e "Até" como texto.

const data = (dado) => criarDataObra(dado).data;

let poemas;
let prosas;
const dados = () => ({ poemas, prosas });
const chaveDe = (titulo, campo = 'intertextualidade', indice = 0) =>
    listarLinhasRevisao(dados()).find(
        (l) => l.titulo === titulo && l.campo === campo && l.indice === indice,
    ).chave;
const edicao = (chave, valores) => ({ chave, valores });

beforeEach(() => {
    poemas = [
        {
            id: 1,
            titulo: 'Águas',
            intertextualidade: [
                {
                    relacao: 'Alusão',
                    obra: 'Águas de Março',
                    autor: 'Tom Jobim',
                    dataObra: data({ nivel: 'ano', ano: 1972 }),
                },
                {
                    relacao: 'Citação',
                    obra: 'Sagarana',
                    autor: 'Guimarães Rosa',
                    dataObra: data({ nivel: 'decada', decada: 1940 }),
                    dataObraAte: data({ nivel: 'decada', decada: 1950 }),
                },
                { relacao: 'Menção', obra: 'Sem data', autor: 'Ninguém' },
            ],
            hipertextualidade: [
                { relacao: 'Paródia', hipotexto: 'Dom Casmurro', autor: 'Machado' },
            ],
        },
    ];
    prosas = [];
});

describe('linhas: a data como texto', () => {
    it('cada linha traz os dois valores na forma escrita, ou vazios', () => {
        const [a, b, c, d] = listarLinhasRevisao(dados());
        assert.equal(a.valores.dataObra, '1972');
        assert.equal(a.valores.dataObraAte, '');
        assert.equal(b.valores.dataObra, 'década de 1940');
        assert.equal(b.valores.dataObraAte, 'década de 1950');
        assert.equal(c.valores.dataObra, '');
        assert.equal(d.valores.dataObra, '');
    });

    it('data gravada que não vale aparece vazia', () => {
        poemas[0].intertextualidade[2].dataObra = { nivel: 'ano', ano: 'xx' };
        const linha = listarLinhasRevisao(dados()).find((l) => l.valores.nome === 'Sem data');
        assert.equal(linha.valores.dataObra, '');
    });

    it('os dois valores entram na lista de colunas, depois da descrição, e valem nos dois campos', () => {
        assert.deepEqual(VALORES_DATA_OBRA, ['dataObra', 'dataObraAte']);
        const i = VALORES_REVISAO.indexOf('descricao');
        assert.deepEqual(VALORES_REVISAO.slice(i + 1, i + 3), VALORES_DATA_OBRA);
        VALORES_DATA_OBRA.forEach((v) => {
            assert.equal(valorAplica('intertextualidade', v), true);
            assert.equal(valorAplica('hipertextualidade', v), true);
        });
    });
});

describe('filtro', () => {
    it('"Sem data da obra" deixa só as linhas sem o começo, nos dois campos', () => {
        const achadas = filtrarLinhasRevisao(listarLinhasRevisao(dados()), '', {
            faltando: 'dataObra',
        });
        assert.deepEqual(
            achadas.map((l) => l.valores.nome),
            ['Sem data', 'Dom Casmurro'],
        );
    });

    it('linha só com o "Até" ainda é "sem data da obra"', () => {
        poemas[0].intertextualidade[2].dataObraAte = data({ nivel: 'ano', ano: 1990 });
        const achadas = filtrarLinhasRevisao(listarLinhasRevisao(dados()), '', {
            faltando: 'dataObra',
        });
        assert.ok(achadas.some((l) => l.valores.nome === 'Sem data'));
    });

    it('combina com o campo e com a busca', () => {
        const linhas = listarLinhasRevisao(dados());
        const achadas = filtrarLinhasRevisao(linhas, 'ninguém', {
            campo: 'intertextualidade',
            faltando: 'dataObra',
        });
        assert.deepEqual(
            achadas.map((l) => l.valores.nome),
            ['Sem data'],
        );
    });

    it('a busca acha pelo texto da data, inclusive "séc. XX" com ponto', () => {
        poemas[0].intertextualidade[2].dataObra = data({ nivel: 'seculo', seculo: 20 });
        const linhas = listarLinhasRevisao(dados());
        assert.deepEqual(
            filtrarLinhasRevisao(linhas, '1972').map((l) => l.valores.nome),
            ['Águas de Março'],
        );
        assert.deepEqual(
            filtrarLinhasRevisao(linhas, 'séc. XX').map((l) => l.valores.nome),
            ['Sem data'],
        );
        assert.deepEqual(
            filtrarLinhasRevisao(linhas, 'década de 1950').map((l) => l.valores.nome),
            ['Sagarana'],
        );
    });
});

describe('planejarRevisao com data', () => {
    it('data nova num texto: o plano diz o valor, e o Aplicar grava a data de verdade', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 2);
        const plano = planejarRevisao(dados(), [
            edicao(chave, { dataObra: 'séc. XX', dataObraAte: '2 de março de 1990' }),
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 1);
        assert.deepEqual(plano.alteracoes[0].mudados, ['dataObra', 'dataObraAte']);
        assert.equal(plano.alteracoes[0].depois.dataObra, 'séc. XX');
        assert.equal(plano.alteracoes[0].depois.dataObraAte, '02/03/1990');
        assert.deepEqual(plano.camposAlterados, { dataObra: 1, dataObraAte: 1 });

        const entrada = poemas[0].intertextualidade[2];
        aplicarRevisao(plano);
        assert.equal(typeof entrada.dataObra, 'object');
        assert.equal(entrada.dataObra.nivel, 'seculo');
        assert.deepEqual([entrada.dataObra.de, entrada.dataObra.ate], [1901, 2000]);
        assert.equal(formatarDataObra(entrada.dataObraAte), '02/03/1990');
    });

    it('o plano só lê: nada muda antes do Aplicar', () => {
        const antes = JSON.stringify(poemas);
        planejarRevisao(dados(), [edicao(chaveDe('Águas'), { dataObra: '1999' })]);
        assert.equal(JSON.stringify(poemas), antes);
    });

    it('mexer só numa ponta não toca a outra', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 1);
        const entrada = poemas[0].intertextualidade[1];
        const inicioAntes = entrada.dataObra;
        aplicarRevisao(planejarRevisao(dados(), [edicao(chave, { dataObraAte: 'séc. XX' })]));
        assert.equal(entrada.dataObra, inicioAntes);
        assert.equal(formatarDataObra(entrada.dataObraAte), 'séc. XX');
    });

    it('a mesma data digitada de outro jeito não é mudança', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 1);
        const plano = planejarRevisao(dados(), [
            edicao(chave, { dataObra: 'anos 1940', dataObraAte: 'DECADA 1950' }),
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 0);
        assert.deepEqual(plano.alteracoes, []);
    });

    it('aprox. a mais é mudança', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 0);
        const plano = planejarRevisao(dados(), [edicao(chave, { dataObra: 'aprox. 1972' })]);
        assert.equal(plano.entradas, 1);
        aplicarRevisao(plano);
        assert.equal(poemas[0].intertextualidade[0].dataObra.aprox, true);
    });

    it('texto vazio tira a data, e a entrada fica sem a chave', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 1);
        const entrada = poemas[0].intertextualidade[1];
        aplicarRevisao(planejarRevisao(dados(), [edicao(chave, { dataObraAte: '   ' })]));
        assert.equal('dataObraAte' in entrada, false);
        assert.ok(entrada.dataObra);
    });

    it('Hipertextualidade também recebe a data', () => {
        const chave = chaveDe('Águas', 'hipertextualidade');
        aplicarRevisao(planejarRevisao(dados(), [edicao(chave, { dataObra: '1899' })]));
        assert.equal(formatarDataObra(poemas[0].hipertextualidade[0].dataObra), '1899');
    });

    it('prosa entra pela mesma regra', () => {
        prosas = [
            { id: 5, titulo: 'Conto', intertextualidade: [{ relacao: 'Citação', obra: 'X' }] },
        ];
        const chave = chaveDe('Conto');
        aplicarRevisao(planejarRevisao(dados(), [edicao(chave, { dataObra: 'década de 1920' })]));
        assert.equal(formatarDataObra(prosas[0].intertextualidade[0].dataObra), 'década de 1920');
    });

    it('data junto de outros valores: o plano conta cada um e o Desfazer devolve tudo', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 0);
        const entrada = poemas[0].intertextualidade[0];
        const antes = JSON.stringify(entrada);
        const plano = planejarRevisao(dados(), [
            edicao(chave, { nome: 'Águas de março', dataObra: '1973', dataObraAte: '1974' }),
        ]);
        assert.deepEqual(plano.alteracoes[0].mudados, ['nome', 'dataObra', 'dataObraAte']);
        const feito = aplicarRevisao(plano);
        assert.equal(entrada.obra, 'Águas de março');
        assert.equal(formatarDataObra(entrada.dataObra), '1973');
        assert.equal(formatarDataObra(entrada.dataObraAte), '1974');
        feito.desfazer();
        assert.equal(JSON.stringify(entrada), antes);
        assert.equal('dataObraAte' in entrada, false);
    });

    it('Desfazer devolve a data apagada, e não deixa chave onde nunca houve', () => {
        const chave1 = chaveDe('Águas', 'intertextualidade', 1);
        const chave2 = chaveDe('Águas', 'intertextualidade', 2);
        const antes = JSON.stringify(poemas);
        const feito = aplicarRevisao(
            planejarRevisao(dados(), [
                edicao(chave1, { dataObra: '', dataObraAte: '' }),
                edicao(chave2, { dataObra: '1950' }),
            ]),
        );
        assert.equal('dataObra' in poemas[0].intertextualidade[1], false);
        assert.ok(poemas[0].intertextualidade[2].dataObra);
        feito.desfazer();
        assert.equal(JSON.stringify(poemas), antes);
        assert.equal('dataObra' in poemas[0].intertextualidade[2], false);
        feito.desfazer();
        assert.equal(JSON.stringify(poemas), antes);
    });

    it('a edição de uma data não mexe no que o formulário não tinha: data de acesso e autores ficam', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 0);
        const entrada = poemas[0].intertextualidade[0];
        aplicarRevisao(planejarRevisao(dados(), [edicao(chave, { dataObra: '1980' })]));
        assert.equal(entrada.autor, 'Tom Jobim');
        assert.equal('dataAcesso' in entrada, false);
        assert.equal('autores' in entrada, false);
    });
});

describe('planejarRevisao: datas que não valem', () => {
    it('texto que não dá para entender recusa tudo e diz a linha, a coluna e o motivo', () => {
        const ok = chaveDe('Águas', 'intertextualidade', 0);
        const ruim = chaveDe('Águas', 'intertextualidade', 2);
        const plano = planejarRevisao(dados(), [
            edicao(ok, { dataObra: '1980' }),
            edicao(ruim, { dataObraAte: 'ontem' }),
        ]);
        assert.equal(plano.erro, 'data-obra-invalida');
        assert.equal(plano.linhaComErro, ruim);
        assert.equal(plano.valorComErro, 'dataObraAte');
        assert.equal(plano.erroData, 'texto-invalido');
        assert.deepEqual(plano.alteracoes, []);
        assert.equal(aplicarRevisao(plano).entradas, 0);
        assert.equal(formatarDataObra(poemas[0].intertextualidade[0].dataObra), '1972');
    });

    it('forma entendida com valor impossível traz o código de criarDataObra', () => {
        const plano = planejarRevisao(dados(), [
            edicao(chaveDe('Águas'), { dataObra: '30/02/1922' }),
        ]);
        assert.equal(plano.erro, 'data-obra-invalida');
        assert.equal(plano.erroData, 'dia-invalido');
        assert.equal(plano.valorComErro, 'dataObra');
    });

    it('o fim antes do começo recusa o plano', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 1);
        const plano = planejarRevisao(dados(), [edicao(chave, { dataObraAte: '1930' })]);
        assert.equal(plano.erro, 'data-obra-fim-antes-do-inicio');
        assert.equal(plano.linhaComErro, chave);
        assert.deepEqual(plano.alteracoes, []);
    });

    it('o par vale com as duas pontas novas, e conta o que já estava na outra', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 0);
        // O começo é 1972: um fim em 1960 só pode estar antes.
        assert.equal(
            planejarRevisao(dados(), [edicao(chave, { dataObraAte: '1960' })]).erro,
            'data-obra-fim-antes-do-inicio',
        );
        // Mudando as duas na mesma edição, conta o par novo.
        assert.equal(
            planejarRevisao(dados(), [edicao(chave, { dataObra: '1950', dataObraAte: '1960' })])
                .erro,
            '',
        );
        // Apagar o começo deixa só o fim, que vale.
        assert.equal(
            planejarRevisao(dados(), [edicao(chave, { dataObra: '', dataObraAte: '1960' })]).erro,
            '',
        );
    });

    it('datas que se sobrepõem valem: começo 1920 e fim séc. XX', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 2);
        const plano = planejarRevisao(dados(), [
            edicao(chave, { dataObra: '1920', dataObraAte: 'séc. XX' }),
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 1);
    });

    it('um par já errado nos dados não trava a edição de outro valor', () => {
        const entrada = poemas[0].intertextualidade[1];
        entrada.dataObra = data({ nivel: 'ano', ano: 1990 });
        entrada.dataObraAte = data({ nivel: 'ano', ano: 1950 });
        const plano = planejarRevisao(dados(), [
            edicao(chaveDe('Águas', 'intertextualidade', 1), { descricao: 'Romance de 1946' }),
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 1);
    });

    it('uma linha que sumiu conta em naoEncontradas e não derruba a data das outras', () => {
        const plano = planejarRevisao(dados(), [
            edicao('poema:99:intertextualidade:0', { dataObra: '1999' }),
            edicao(chaveDe('Águas', 'intertextualidade', 2), { dataObra: '1999' }),
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.naoEncontradas, 1);
        assert.equal(plano.entradas, 1);
    });
});

describe('descrição e mensagens', () => {
    it('a confirmação mostra o antes e o depois da data em texto', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 0);
        const plano = planejarRevisao(dados(), [edicao(chave, { dataObra: 'séc. XX' })]);
        const { linhas } = descreverRevisao(plano);
        assert.equal(linhas[0], 'Águas (Intertextualidade), data da obra: «1972» → «séc. XX»');
    });

    it('data apagada aparece como (vazio), e o "Até" tem o rótulo "até"', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 1);
        const plano = planejarRevisao(dados(), [edicao(chave, { dataObraAte: '' })]);
        assert.equal(
            descreverRevisao(plano).linhas[0],
            'Águas (Intertextualidade), até: «década de 1950» → (vazio)',
        );
        assert.equal(ROTULOS_VALOR_REVISAO.dataObraAte, 'até');
    });

    it('as duas recusas novas têm mensagem, sem travessão', () => {
        ['data-obra-invalida', 'data-obra-fim-antes-do-inicio'].forEach((c) => {
            assert.ok(MENSAGENS_ERRO_REVISAO[c], c);
            assert.ok(!/[—–]/.test(MENSAGENS_ERRO_REVISAO[c]), c);
        });
    });
});

describe('o que a entrada guarda', () => {
    it('depois do Aplicar a data é a mesma que o modal grava (lerDataObra não muda nada)', () => {
        const chave = chaveDe('Águas', 'intertextualidade', 2);
        aplicarRevisao(planejarRevisao(dados(), [edicao(chave, { dataObra: 'aprox. 44 a.C.' })]));
        const gravada = poemas[0].intertextualidade[2].dataObra;
        assert.deepEqual(gravada, lerDataObra(gravada));
        assert.equal(gravada.aC, true);
        assert.equal(gravada.aprox, true);
        assert.deepEqual([gravada.de, gravada.ate], [-44, -44]);
    });
});
