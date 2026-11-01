import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Busca por data da obra (T9, pendência fechada em 27/10/2026): os prefixos
// `dataobra:`, `datareferencia:`, `distanciaobra:` e `distanciareferencia:`,
// que as barras de "Datas das obras" usam para abrir a lista de textos.

const { db } = await import('../js/db.js');
const { criarDataObra, distanciaEmAnos, anoDeReferenciaDaEntrada } =
    await import('../js/data-da-obra.js');
const {
    intervaloDeAnosDaConsulta,
    numerosBatemComConsulta,
    camposDeBuscaDeDatas,
    textoDoIntervaloDeAnos,
} = await import('../js/busca-data-obra.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO, anoDeEscritaDoTexto } =
    await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const {
    agregarTextosPorSeculo,
    agregarTextosPorDecada,
    agregarDistanciaDaObra,
    intervaloDoSeculo,
    intervaloDaDecada,
    consultaDeDataDaBarra,
    consultaDeDistanciaDaFaixa,
    FONTES_DATA_OBRA,
    decadaDoAno,
    seculoDoAno,
} = await import('../js/estatisticas-dados-data-obra.js');

const d = (e) => criarDataObra(e).data;
const ano = (n, aC = false) => d({ nivel: 'ano', ano: String(n), aC });
const seculo = (n, aC = false) => d({ nivel: 'seculo', seculo: String(n), aC });
const decada = (n) => d({ nivel: 'decada', decada: String(n) });

const ids = (lista) => lista.map((i) => i.id);

function zerarDb() {
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    db.epocas = [];
    db.periodosHistoricos = [];
    db.movimentosEscolas = [];
    db.temas = [];
    db.assuntos = [];
    db.prosas = [];
}

function montar() {
    zerarDb();
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            dataEscrita: { ano: 2000 },
            intertextualidade: [{ obra: 'X', dataObra: seculo(20) }],
        },
        {
            id: 2,
            titulo: 'B',
            dataEscrita: { ano: 1950 },
            hipertextualidade: [{ hipotexto: 'Y', dataObra: ano(1922) }],
        },
        {
            id: 3,
            titulo: 'C',
            dataEscrita: { ano: 2010 },
            referenciasExternas: [{ tipo: 'Pessoa pública', texto: 'Z', dataObra: ano(44, true) }],
        },
        { id: 4, titulo: 'D', dataEscrita: { ano: 1990 }, intertextualidade: [{ obra: 'W' }] },
        {
            id: 5,
            titulo: 'E',
            dataEscrita: { ano: 1900 },
            intertextualidade: [{ obra: 'V', dataObra: ano(1922) }],
        },
        {
            id: 6,
            titulo: 'F',
            dataEscrita: { ano: 2000 },
            intertextualidade: [
                { obra: 'U', dataObra: ano(1922) },
                { obra: 'T', dataObra: ano(1500) },
            ],
            referenciasExternas: [{ tipo: 'Marco histórico', texto: 'S', dataObra: ano(1929) }],
        },
        // Datada, mas o texto não tem ano de escrita: fica fora da distância.
        {
            id: 7,
            titulo: 'G',
            intertextualidade: [{ obra: 'R', dataObra: decada(1920) }],
        },
        { id: 8, titulo: 'H sem entradas', dataEscrita: { ano: 2001 } },
    ];
    return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
}

describe('intervaloDeAnosDaConsulta', () => {
    it('lê um ano, com sinal para a.C.', () => {
        assert.deepEqual(intervaloDeAnosDaConsulta('1922'), { de: 1922, ate: 1922 });
        assert.deepEqual(intervaloDeAnosDaConsulta('-44'), { de: -44, ate: -44 });
    });

    it('lê intervalos, abertos ou não, e conserta a ordem trocada', () => {
        assert.deepEqual(intervaloDeAnosDaConsulta('1920..1935'), { de: 1920, ate: 1935 });
        assert.deepEqual(intervaloDeAnosDaConsulta('1935..1920'), { de: 1920, ate: 1935 });
        assert.deepEqual(intervaloDeAnosDaConsulta('500..'), { de: 500, ate: Infinity });
        assert.deepEqual(intervaloDeAnosDaConsulta('..-1'), { de: -Infinity, ate: -1 });
        assert.deepEqual(intervaloDeAnosDaConsulta('-439..-430'), { de: -439, ate: -430 });
    });

    it('lê texto de data pelo intervalo de anos que o nível cobre', () => {
        assert.deepEqual(intervaloDeAnosDaConsulta('1920s'), { de: 1920, ate: 1929 });
        assert.deepEqual(intervaloDeAnosDaConsulta('década de 1920'), { de: 1920, ate: 1929 });
        assert.deepEqual(intervaloDeAnosDaConsulta('séc. XX'), { de: 1901, ate: 2000 });
        assert.deepEqual(intervaloDeAnosDaConsulta('séc. V a.C.'), { de: -500, ate: -401 });
        assert.deepEqual(intervaloDeAnosDaConsulta('02/1922'), { de: 1922, ate: 1922 });
    });

    it('devolve null para o que não entende', () => {
        assert.equal(intervaloDeAnosDaConsulta(''), null);
        assert.equal(intervaloDeAnosDaConsulta('..'), null);
        assert.equal(intervaloDeAnosDaConsulta('1920..abc'), null);
        assert.equal(intervaloDeAnosDaConsulta('1..2..3'), null);
        assert.equal(intervaloDeAnosDaConsulta('romance'), null);
        assert.equal(intervaloDeAnosDaConsulta('anos 20'), null);
    });

    it('sem aceitaData (distância), texto de data não vale', () => {
        assert.equal(intervaloDeAnosDaConsulta('1920s', { aceitaData: false }), null);
        assert.equal(intervaloDeAnosDaConsulta('séc. XX', { aceitaData: false }), null);
        assert.deepEqual(intervaloDeAnosDaConsulta('10..49', { aceitaData: false }), {
            de: 10,
            ate: 49,
        });
    });
});

describe('textoDoIntervaloDeAnos e numerosBatemComConsulta', () => {
    it('escreve o intervalo como a busca lê', () => {
        assert.equal(textoDoIntervaloDeAnos(1920, 1929), '1920..1929');
        assert.equal(textoDoIntervaloDeAnos(1922, 1922), '1922');
        assert.equal(textoDoIntervaloDeAnos(500, Infinity), '500..');
        assert.equal(textoDoIntervaloDeAnos(-Infinity, -1), '..-1');
        assert.equal(textoDoIntervaloDeAnos(-439, -430), '-439..-430');
    });

    it('o que se escreve se lê de volta', () => {
        [
            [1920, 1929],
            [-500, -401],
            [500, Infinity],
            [-Infinity, -1],
            [7, 7],
        ].forEach(([de, ate]) => {
            assert.deepEqual(intervaloDeAnosDaConsulta(textoDoIntervaloDeAnos(de, ate)), {
                de,
                ate,
            });
        });
    });

    it('algum número no intervalo basta; lista vazia ou termo ruim não casa', () => {
        assert.equal(numerosBatemComConsulta([1500, 1922], '1920..1929'), true);
        assert.equal(numerosBatemComConsulta([1500], '1920..1929'), false);
        assert.equal(numerosBatemComConsulta([], '1920..1929'), false);
        assert.equal(numerosBatemComConsulta(undefined, '1920..1929'), false);
        assert.equal(numerosBatemComConsulta([1922], 'romance'), null);
    });
});

describe('camposDeBuscaDeDatas', () => {
    it('separa Obras (Inter e Hiper) de Referências e calcula a distância', () => {
        const campos = camposDeBuscaDeDatas(
            {
                intertextualidade: [{ dataObra: ano(1922) }, { obra: 'sem data' }],
                hipertextualidade: [{ dataObra: seculo(19), dataObraAte: ano(1890) }],
                referenciasExternas: [{ dataObra: ano(44, true) }],
            },
            2000,
        );
        assert.deepEqual(campos._anosDataObra, [1922, 1801]);
        assert.deepEqual(campos._distanciasObra, [78, 199]);
        assert.equal(campos._buscaDataObra, '1922 séc. XIX até 1890');
        assert.equal(campos._buscaDistanciaObra, '78 199');
        assert.deepEqual(campos._anosDataReferencia, [-44]);
        // Sem ano zero: de 44 a.C. a 2000 são 2043 anos, não 2044.
        assert.deepEqual(campos._distanciasReferencia, [2043]);
    });

    it('sem ano do texto, a data entra e a distância não', () => {
        const campos = camposDeBuscaDeDatas({ intertextualidade: [{ dataObra: ano(1922) }] }, null);
        assert.deepEqual(campos._anosDataObra, [1922]);
        assert.deepEqual(campos._distanciasObra, []);
        assert.equal(campos._buscaDistanciaObra, '');
    });

    it('item sem entradas, ou sem lista, fica com tudo vazio', () => {
        const campos = camposDeBuscaDeDatas({}, 2000);
        assert.equal(campos._buscaDataObra, '');
        assert.deepEqual(campos._anosDataReferencia, []);
        assert.equal(camposDeBuscaDeDatas(null)._buscaDistanciaObra, '');
    });

    it('a regra de ano e de distância é a mesma das Estatísticas', () => {
        assert.equal(anoDeReferenciaDaEntrada({ dataObraAte: ano(1935) }), 1935);
        assert.equal(distanciaEmAnos(1, -1), 1);
        assert.equal(distanciaEmAnos(2000, -44), 2043);
        assert.equal(distanciaEmAnos(1900, 1922), -22);
        assert.equal(anoDeEscritaDoTexto({ dataEscrita: { ano: 1999 } }), 1999);
        assert.equal(anoDeEscritaDoTexto({ ano: 1980 }), 1980);
        assert.equal(anoDeEscritaDoTexto({}), null);
    });
});

describe('prefixos na busca', () => {
    it('os quatro prefixos existem e têm nome canônico', () => {
        const canonicos = Object.values(PREFIXOS_CANONICOS_POR_CAMPO);
        ['dataobra', 'datareferencia', 'distanciaobra', 'distanciareferencia'].forEach((p) =>
            assert.ok(canonicos.includes(p), p),
        );
    });

    it('dataobra: com ano, intervalo, década e século', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:1922')), [2, 5, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:1920..1929')), [2, 5, 6, 7]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:"década de 1920"')), [2, 5, 6, 7]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:1920s')), [2, 5, 6, 7]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:"séc. XX"')), [1, 2, 5, 6, 7]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:..1600')), [6]);
    });

    it('a data é pelo ano de referência: século XX não vira 1950, e 1901 sim', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:1950')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:1901')), [1]);
    });

    it('um texto com obras de épocas diferentes aparece em cada uma', () => {
        const itens = montar();
        assert.ok(ids(filtrarTextos(itens, 'dataobra:1500')).includes(6));
        assert.ok(ids(filtrarTextos(itens, 'dataobra:1922')).includes(6));
    });

    it('datareferencia: só olha as Referências', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'datareferencia:-44')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'datareferencia:"séc. I a.C."')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'datareferencia:1922')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'datareferencia:1920s')), [6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:-44')), []);
    });

    it('ou junta Obras e Referências', () => {
        const itens = montar();
        assert.deepEqual(
            ids(filtrarTextos(itens, 'dataobra:1920..1929 ou datareferencia:1920..1929')),
            [2, 5, 6, 7],
        );
    });

    it('* e -* separam quem tem data de quem não tem', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:*')), [1, 2, 5, 6, 7]);
        assert.deepEqual(ids(filtrarTextos(itens, '-dataobra:*')), [3, 4, 8]);
        assert.deepEqual(ids(filtrarTextos(itens, 'datareferencia:*')), [3, 6]);
    });

    it('exclusão com - e combinação com outros termos', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, '-dataobra:1922 dataobra:*')), [1, 7]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:1922 titulo:E')), [5]);
    });

    it('termo que não é ano nem data volta a procurar no texto da data', () => {
        const itens = montar();
        // "séc." só existe no texto da data do poema 1.
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:séc.')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:romance')), []);
    });

    it('distanciaobra: conta ano do texto menos ano da obra', () => {
        const itens = montar();
        // Distâncias das Obras: 1 → 99; 2 → 28; 5 → -22; 6 → 78 e 500; 4 e 7 sem distância.
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:..-1')), [5]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:0..9')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:10..49')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:50..99')), [1, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:500..')), [6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:28')), [2]);
    });

    it('distanciareferencia: só as Referências; texto de data não vale', () => {
        const itens = montar();
        // 3 → 2010 - (-44) - 1 = 2053; 6 → 2000 - 1929 = 71.
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciareferencia:500..')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciareferencia:50..99')), [6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:1920s')), []);
    });

    it('distância: * acha quem tem alguma e -* quem não tem nenhuma', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobra:*')), [1, 2, 5, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, '-distanciaobra:*')), [3, 4, 7, 8]);
    });
});

describe('a lista que a barra abre tem os mesmos textos que a barra', () => {
    function idsDaConsulta(itens, consulta) {
        return filtrarTextos(itens, consulta).map((i) => i.id);
    }
    const idsDaBarra = (barra) => barra.ids.map((x) => x.id);

    FONTES_DATA_OBRA.forEach((fonte) => {
        it(`séculos, fonte ${fonte}`, () => {
            const itens = montar();
            const { itens: barras } = agregarTextosPorSeculo(fonte);
            assert.ok(barras.length > 0);
            barras.forEach((b) => {
                const consulta = consultaDeDataDaBarra(fonte, intervaloDoSeculo(b.chave));
                assert.deepEqual(
                    idsDaConsulta(itens, consulta).sort((a, c) => a - c),
                    idsDaBarra(b).sort((a, c) => a - c),
                    `${b.rotulo} (${consulta})`,
                );
            });
        });

        it(`décadas, fonte ${fonte}`, () => {
            const itens = montar();
            const { itens: barras } = agregarTextosPorDecada(fonte);
            assert.ok(barras.length > 0);
            barras.forEach((b) => {
                const consulta = consultaDeDataDaBarra(fonte, intervaloDaDecada(b.chave));
                assert.deepEqual(
                    idsDaConsulta(itens, consulta).sort((a, c) => a - c),
                    idsDaBarra(b).sort((a, c) => a - c),
                    `${b.rotulo} (${consulta})`,
                );
            });
        });

        it(`distância, fonte ${fonte}`, () => {
            const itens = montar();
            const { itens: barras } = agregarDistanciaDaObra(fonte);
            barras.forEach((b) => {
                const consulta = consultaDeDistanciaDaFaixa(fonte, b);
                assert.deepEqual(
                    idsDaConsulta(itens, consulta).sort((a, c) => a - c),
                    idsDaBarra(b).sort((a, c) => a - c),
                    `${b.rotulo} (${consulta})`,
                );
            });
        });
    });
});

describe('intervalo do século e da década', () => {
    it('século', () => {
        assert.deepEqual(intervaloDoSeculo(20), { de: 1901, ate: 2000 });
        assert.deepEqual(intervaloDoSeculo(1), { de: 1, ate: 100 });
        assert.deepEqual(intervaloDoSeculo(-5), { de: -500, ate: -401 });
        assert.deepEqual(intervaloDoSeculo(-1), { de: -100, ate: -1 });
    });

    it('década', () => {
        assert.deepEqual(intervaloDaDecada({ n: 1920, aC: false }), { de: 1920, ate: 1929 });
        assert.deepEqual(intervaloDaDecada({ n: 0, aC: false }), { de: 1, ate: 9 });
        assert.deepEqual(intervaloDaDecada({ n: 430, aC: true }), { de: -439, ate: -430 });
        assert.deepEqual(intervaloDaDecada({ n: 0, aC: true }), { de: -9, ate: -1 });
    });

    it('todo ano cai no intervalo do seu século e da sua década', () => {
        [
            1, 9, 10, 99, 100, 101, 1900, 1901, 1929, 2000, -1, -9, -10, -100, -101, -430, -439,
        ].forEach((a) => {
            const s = intervaloDoSeculo(seculoDoAno(a));
            const dc = intervaloDaDecada(decadaDoAno(a));
            assert.ok(a >= s.de && a <= s.ate, `século de ${a}`);
            assert.ok(a >= dc.de && a <= dc.ate, `década de ${a}`);
        });
    });
});

describe('consulta da barra', () => {
    it('Obras, Referências e Todas', () => {
        assert.equal(
            consultaDeDataDaBarra('obras', { de: 1920, ate: 1929 }),
            'dataobra:1920..1929',
        );
        assert.equal(
            consultaDeDataDaBarra('referencias', { de: 1920, ate: 1929 }),
            'datareferencia:1920..1929',
        );
        assert.equal(
            consultaDeDataDaBarra('todas', { de: 1920, ate: 1929 }),
            'dataobra:1920..1929 ou datareferencia:1920..1929',
        );
    });

    it('distância: pontas abertas', () => {
        const depois = { min: -Infinity, max: -1 };
        const cinco = { min: 500, max: Infinity };
        assert.equal(consultaDeDistanciaDaFaixa('obras', depois), 'distanciaobra:..-1');
        assert.equal(consultaDeDistanciaDaFaixa('referencias', cinco), 'distanciareferencia:500..');
        assert.equal(
            consultaDeDistanciaDaFaixa('todas', cinco),
            'distanciaobra:500.. ou distanciareferencia:500..',
        );
    });
});

beforeEach(() => {
    zerarDb();
});
