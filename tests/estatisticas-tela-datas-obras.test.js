import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Aba "Datas das obras" (T9, entrega 9b de 13): os textos de apoio de cada
// gráfico e a troca de fonte. O desenho dos gráficos fica para o navegador.

const {
    resumoDosTextosPorData,
    resumoDaDistancia,
    getFonteDatasObras,
    consultaDoCliqueNaBarra,
    htmlZoomDistancia,
    aproximarDistancia,
    voltarZoomDistancia,
    verTudoDistancia,
    getZoomDistancia,
    definirFonteDatasObras,
} = await import('../js/estatisticas-tela-datas-obras.js');

describe('resumoDosTextosPorData', () => {
    it('sem textos com entradas da fonte', () => {
        assert.equal(
            resumoDosTextosPorData({ itens: [], comEntradas: 0, comData: 0, semData: 0 }),
            'Nenhum texto deste recorte tem entradas dessa fonte.',
        );
    });

    it('diz o denominador, o que fica fora e por que a soma passa do total', () => {
        const txt = resumoDosTextosPorData({
            itens: [{ textos: 2 }, { textos: 2 }],
            comEntradas: 4,
            comData: 3,
            semData: 1,
        });
        assert.match(txt, /3 textos entram nas barras, de 4 textos com entradas/);
        assert.match(txt, /Ficam fora 1 texto sem nenhuma data da obra\./);
        assert.match(txt, /soma das barras \(4\) passa do total/);
    });

    it('um texto só usa o singular e não fala de soma quando ela bate', () => {
        const txt = resumoDosTextosPorData({
            itens: [{ textos: 1 }],
            comEntradas: 1,
            comData: 1,
            semData: 0,
        });
        assert.match(txt, /^1 texto entra nas barras, de 1 texto com entradas/);
        assert.doesNotMatch(txt, /soma|Ficam fora/);
    });
});

describe('resumoDaDistancia', () => {
    const base = {
        itens: [],
        entradasComDistancia: 0,
        entradasSemAnoDoTexto: 0,
        textosComEntradas: 3,
    };

    it('diz como as faixas se ajustaram ao recorte', () => {
        const txt = resumoDaDistancia({
            ...base,
            entradasComDistancia: 4,
            passo: 5,
            menor: 12,
            maior: 49,
        });
        assert.match(txt, /faixas se ajustam ao recorte: de 12 a 49 anos, de 5 em 5 anos/);
        assert.match(
            resumoDaDistancia({ ...base, entradasComDistancia: 1, passo: 1, menor: 7, maior: 7 }),
            /de ano em ano/,
        );
    });

    it('sem entradas, e com entradas sem nenhuma data', () => {
        assert.match(resumoDaDistancia({ ...base, textosComEntradas: 0 }), /Nenhum texto/);
        assert.match(resumoDaDistancia(base), /Nenhuma entrada tem data da obra/);
    });

    it('conta as entradas, as sem ano do texto e avisa das datadas depois do texto', () => {
        const txt = resumoDaDistancia({
            ...base,
            itens: [{ chave: 'depois', entradas: 2 }],
            entradasComDistancia: 5,
            entradasSemAnoDoTexto: 1,
        });
        assert.match(txt, /5 entradas entram nas barras/);
        assert.match(txt, /Ficam fora 1 entrada datada de textos sem ano de escrita/);
        assert.match(txt, /2 entradas têm data depois do texto/);
    });
});

describe('fonte', () => {
    it('começa em Obras', () => {
        assert.equal(getFonteDatasObras(), 'obras');
    });
});

describe('consultaDoCliqueNaBarra', () => {
    const seculos = {
        itens: [
            { rotulo: 'séc. XX', chave: 20 },
            { rotulo: 'séc. I a.C.', chave: -1 },
        ],
    };
    const decadas = {
        itens: [
            { rotulo: 'década de 1920', chave: { n: 1920, aC: false } },
            { rotulo: 'anos 1 a 9', chave: { n: 0, aC: false } },
            { rotulo: 'década de 430 a.C.', chave: { n: 430, aC: true } },
        ],
    };

    it('século: o intervalo de anos do século, na fonte escolhida', () => {
        assert.equal(
            consultaDoCliqueNaBarra('seculo', 'obras', 'séc. XX', seculos),
            'dataobra:1901..2000',
        );
        assert.equal(
            consultaDoCliqueNaBarra('seculo', 'referencias', 'séc. I a.C.', seculos),
            'datareferencia:-100..-1',
        );
        assert.equal(
            consultaDoCliqueNaBarra('seculo', 'todas', 'séc. XX', seculos),
            'dataobra:1901..2000 ou datareferencia:1901..2000',
        );
    });

    it('década: inclusive a dos anos 1 a 9 e a de antes de Cristo', () => {
        assert.equal(
            consultaDoCliqueNaBarra('decada', 'obras', 'década de 1920', decadas),
            'dataobra:1920..1929',
        );
        assert.equal(
            consultaDoCliqueNaBarra('decada', 'obras', 'anos 1 a 9', decadas),
            'dataobra:1..9',
        );
        assert.equal(
            consultaDoCliqueNaBarra('decada', 'obras', 'década de 430 a.C.', decadas),
            'dataobra:-439..-430',
        );
    });

    it('distância: a faixa da barra pelo rótulo, com a ponta aberta só em "Depois"', () => {
        const dados = {
            itens: [
                { rotulo: 'Depois do texto', min: -Infinity, max: -1 },
                { rotulo: '100 a 199 anos', min: 100, max: 199 },
                { rotulo: '7 anos', min: 7, max: 7 },
            ],
        };
        assert.equal(
            consultaDoCliqueNaBarra('distancia', 'obras', 'Depois do texto', dados),
            'distanciaobra:..-1',
        );
        assert.equal(
            consultaDoCliqueNaBarra('distancia', 'referencias', '100 a 199 anos', dados),
            'distanciareferencia:100..199',
        );
        assert.equal(
            consultaDoCliqueNaBarra('distancia', 'obras', '7 anos', dados),
            'distanciaobra:7',
        );
    });

    it('rótulo que não é de nenhuma barra não abre nada', () => {
        assert.equal(consultaDoCliqueNaBarra('seculo', 'obras', 'séc. XXX', seculos), null);
        assert.equal(consultaDoCliqueNaBarra('decada', 'obras', 'x', undefined), null);
        assert.equal(consultaDoCliqueNaBarra('distancia', 'obras', 'x', { itens: [] }), null);
    });
});

describe('zoom do gráfico de distância temporal', () => {
    it('a pilha sobe com o zoom, desce com Voltar e zera com Ver tudo', () => {
        verTudoDistancia();
        assert.equal(aproximarDistancia({ min: 0, max: 249 }), true);
        assert.equal(aproximarDistancia({ min: 100, max: 149 }), true);
        assert.deepEqual(getZoomDistancia(), [
            { min: 0, max: 249 },
            { min: 100, max: 149 },
        ]);
        voltarZoomDistancia();
        assert.deepEqual(getZoomDistancia(), [{ min: 0, max: 249 }]);
        aproximarDistancia({ min: 20, max: 39 });
        verTudoDistancia();
        assert.deepEqual(getZoomDistancia(), []);
    });

    it('faixa que não permite zoom não entra na pilha', () => {
        verTudoDistancia();
        assert.equal(aproximarDistancia({ min: -Infinity, max: -1 }), false);
        assert.equal(aproximarDistancia({ min: 7, max: 7 }), false);
        assert.deepEqual(getZoomDistancia(), []);
    });

    it('trocar a fonte volta ao gráfico inteiro', () => {
        aproximarDistancia({ min: 0, max: 249 });
        definirFonteDatasObras('referencias');
        assert.deepEqual(getZoomDistancia(), []);
        definirFonteDatasObras('obras');
    });

    it('a linha do zoom mostra o caminho e os botões; vazia sem zoom', () => {
        assert.equal(htmlZoomDistancia([]), '');
        const um = htmlZoomDistancia([{ min: 0, max: 249 }]);
        assert.match(um, /Zoom: Tudo › 0 a 249 anos/);
        assert.match(um, /voltarZoomDistancia\(\)/);
        assert.doesNotMatch(um, /verTudoDistancia/);
        const dois = htmlZoomDistancia([
            { min: 0, max: 249 },
            { min: 100, max: 149 },
        ]);
        assert.match(dois, /Tudo › 0 a 249 anos › 100 a 149 anos/);
        assert.match(dois, /verTudoDistancia\(\)/);
    });

    it('o resumo avisa o zoom', () => {
        const txt = resumoDaDistancia({
            itens: [],
            entradasComDistancia: 3,
            entradasSemAnoDoTexto: 0,
            textosComEntradas: 3,
            recorte: { min: 0, max: 249 },
        });
        assert.match(txt, /^Zoom na faixa de 0 a 249 anos/);
    });
});
