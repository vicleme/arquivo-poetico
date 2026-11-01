import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Obra pessoal, entrega 4: o filtro de Estatísticas › Datas das obras (todas as
// obras, sem as pessoais, só as pessoais) e os quatro prefixos de busca que
// fazem a lista aberta por cada barra ter os mesmos textos da barra.

const { db } = await import('../js/db.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const { camposDeBuscaDeDatas } = await import('../js/busca-data-obra.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const {
    MODOS_OBRA_PESSOAL,
    agregarTextosPorSeculo,
    agregarTextosPorDecada,
    agregarDistanciaDaObra,
    contarEntradasPessoais,
    intervaloDoSeculo,
    intervaloDaDecada,
    consultaDeDataDaBarra,
    consultaDeDistanciaDaFaixa,
} = await import('../js/estatisticas-dados-data-obra.js');
const { consultaDoCliqueNaBarra, descricaoDoModo, resumoDosTextosPorData, resumoDaDistancia } =
    await import('../js/estatisticas-tela-datas-obras.js');

const d = (e) => criarDataObra(e).data;
const ano = (n, aC = false) => d({ nivel: 'ano', ano: String(n), aC });
const ids = (lista) => lista.map((i) => i.id).sort((a, b) => a - b);

function zerarDb() {
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
}

// 1: só obra pública; 2: só obra pessoal; 3: uma de cada; 4: pessoal sem data;
// 5: só referência; 6: hipertextualidade pessoal e referência.
function montar() {
    zerarDb();
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            dataEscrita: { ano: 2000 },
            intertextualidade: [{ obra: 'Pública', dataObra: ano(1922) }],
        },
        {
            id: 2,
            titulo: 'B',
            dataEscrita: { ano: 2001 },
            intertextualidade: [{ obra: 'Diário', dataObra: ano(1999), obraPessoal: true }],
        },
        {
            id: 3,
            titulo: 'C',
            dataEscrita: { ano: 2002 },
            intertextualidade: [
                { obra: 'Pública', dataObra: ano(1500) },
                { obra: 'Carta', dataObra: ano(2001), obraPessoal: true },
            ],
        },
        {
            id: 4,
            titulo: 'D',
            dataEscrita: { ano: 2003 },
            intertextualidade: [{ obra: 'Conversa', obraPessoal: true }],
        },
        {
            id: 5,
            titulo: 'E',
            dataEscrita: { ano: 2004 },
            referenciasExternas: [{ tipo: 'Pessoa pública', texto: 'Z', dataObra: ano(1922) }],
        },
        {
            id: 6,
            titulo: 'F',
            dataEscrita: { ano: 2005 },
            hipertextualidade: [{ hipotexto: 'Bilhete', dataObra: ano(2003), obraPessoal: true }],
            referenciasExternas: [{ tipo: 'Marco histórico', texto: 'S', dataObra: ano(1929) }],
        },
    ];
    return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
}

beforeEach(() => {
    db.poemas = [];
});

describe('contarEntradasPessoais', () => {
    it('conta as entradas de Obras e as marcadas; referência fica fora', () => {
        montar();
        assert.deepEqual(contarEntradasPessoais(db.poemas), { total: 6, pessoais: 4 });
    });

    it('recorte sem nada devolve zeros', () => {
        assert.deepEqual(contarEntradasPessoais([]), { total: 0, pessoais: 0 });
    });
});

describe('agregações com o modo', () => {
    it('"todas" é o padrão e não muda nada', () => {
        montar();
        assert.deepEqual(
            agregarTextosPorSeculo('todas', db.poemas, 'todas'),
            agregarTextosPorSeculo('todas', db.poemas),
        );
        assert.deepEqual(MODOS_OBRA_PESSOAL, ['todas', 'sem', 'so']);
    });

    it('"sem" tira as entradas marcadas: o texto 2 sai, o 3 fica só com a pública', () => {
        montar();
        const r = agregarTextosPorSeculo('obras', db.poemas, 'sem');
        assert.deepEqual(
            r.itens.map((i) => [i.rotulo, ids(i.ids)]),
            [
                ['séc. XV', [3]],
                ['séc. XX', [1]],
            ],
        );
        assert.equal(r.comEntradas, 2);
    });

    it('"so" deixa só as marcadas; o texto 4 (marcado, sem data) vira "sem data"', () => {
        montar();
        const r = agregarTextosPorSeculo('obras', db.poemas, 'so');
        assert.deepEqual(
            r.itens.map((i) => [i.rotulo, ids(i.ids)]),
            [
                ['séc. XX', [2]],
                ['séc. XXI', [3, 6]],
            ],
        );
        assert.equal(r.comEntradas, 4);
        assert.equal(r.semData, 1);
    });

    it('as Referências ficam em "sem" e saem em "so" na fonte "todas"', () => {
        montar();
        const sem = agregarTextosPorSeculo('todas', db.poemas, 'sem');
        assert.deepEqual(ids(sem.itens.find((i) => i.rotulo === 'séc. XX').ids), [1, 5, 6]);
        const so = agregarTextosPorSeculo('todas', db.poemas, 'so');
        assert.deepEqual(ids(so.itens.find((i) => i.rotulo === 'séc. XX').ids), [2]);
        assert.equal(so.comEntradas, 4);
    });

    it('na fonte "referencias" o modo não faz nada', () => {
        montar();
        const base = agregarTextosPorSeculo('referencias', db.poemas);
        assert.deepEqual(agregarTextosPorSeculo('referencias', db.poemas, 'so'), base);
        assert.deepEqual(agregarTextosPorSeculo('referencias', db.poemas, 'sem'), base);
    });

    it('a distância conta entradas conforme o modo', () => {
        montar();
        const so = agregarDistanciaDaObra('obras', db.poemas, 'so');
        // Diário (2001-1999=2), Carta (2002-2001=1), Bilhete (2005-2003=2); Conversa sem data.
        assert.equal(so.entradasComDistancia, 3);
        // Distâncias 1, 2, 2: uma faixa de um ano por valor.
        assert.equal(so.itens.find((i) => i.chave === '1-1').entradas, 1);
        assert.equal(so.itens.find((i) => i.chave === '2-2').entradas, 2);
        const sem = agregarDistanciaDaObra('obras', db.poemas, 'sem');
        assert.equal(sem.entradasComDistancia, 2);
        // Distâncias 78 e 502: o passo cobre os dois valores em até 12 barras.
        assert.equal(sem.itens.find((i) => i.min <= 78 && 78 <= i.max).entradas, 1);
        assert.equal(sem.itens.find((i) => i.min <= 502 && 502 <= i.max).entradas, 1);
    });
});

describe('campos e prefixos de busca por marca', () => {
    it('separam anos e distâncias das Obras pela marca da entrada', () => {
        const c = camposDeBuscaDeDatas(montar.call(null) && db.poemas[2], 2002);
        assert.deepEqual(c._anosDataObraPublica, [1500]);
        assert.deepEqual(c._anosDataObraPessoal, [2001]);
        assert.deepEqual(c._anosDataObra, [1500, 2001]);
        assert.deepEqual(c._distanciasObraPessoal, [1]);
        assert.deepEqual(c._distanciasObraPublica, [502]);
        // As Referências não se dividem.
        assert.equal('_anosDataReferenciaPessoal' in c, false);
    });

    it('os prefixos existem e são canônicos', () => {
        const canonicos = Object.values(PREFIXOS_CANONICOS_POR_CAMPO);
        [
            'dataobrapublica',
            'dataobrapessoal',
            'distanciaobrapublica',
            'distanciaobrapessoal',
        ].forEach((p) => assert.ok(canonicos.includes(p), p));
    });

    it('filtram por entrada, não por texto', () => {
        const itens = montar();
        // `dataobra:` acha o texto 3 por qualquer entrada; os novos separam.
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobra:2001')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobrapessoal:2001')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobrapublica:2001')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobrapublica:1500')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobrapessoal:1500')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobrapessoal:1..2')), [2, 3, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'distanciaobrapublica:500..')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataobrapessoal:*')), [2, 3, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, '-dataobrapessoal:*')), [1, 4, 5]);
    });
});

describe('consultas da barra por modo', () => {
    const faixa = { min: 0, max: 9 };

    it('Obras: um prefixo por modo', () => {
        assert.equal(
            consultaDeDataDaBarra('obras', { de: 1901, ate: 2000 }),
            'dataobra:1901..2000',
        );
        assert.equal(
            consultaDeDataDaBarra('obras', { de: 1901, ate: 2000 }, 'sem'),
            'dataobrapublica:1901..2000',
        );
        assert.equal(
            consultaDeDataDaBarra('obras', { de: 1901, ate: 2000 }, 'so'),
            'dataobrapessoal:1901..2000',
        );
        assert.equal(consultaDeDistanciaDaFaixa('obras', faixa, 'so'), 'distanciaobrapessoal:0..9');
    });

    it('Todas: "sem" junta com a referência e "so" fica só nas Obras', () => {
        const i = { de: 1920, ate: 1929 };
        assert.equal(
            consultaDeDataDaBarra('todas', i),
            'dataobra:1920..1929 ou datareferencia:1920..1929',
        );
        assert.equal(
            consultaDeDataDaBarra('todas', i, 'sem'),
            'dataobrapublica:1920..1929 ou datareferencia:1920..1929',
        );
        assert.equal(consultaDeDataDaBarra('todas', i, 'so'), 'dataobrapessoal:1920..1929');
    });

    it('Referências ignoram o modo', () => {
        assert.equal(
            consultaDeDataDaBarra('referencias', { de: 1920, ate: 1929 }, 'so'),
            'datareferencia:1920..1929',
        );
    });
});

describe('a lista da barra tem os mesmos textos da barra, em cada modo e fonte', () => {
    for (const fonte of ['obras', 'referencias', 'todas']) {
        for (const modo of MODOS_OBRA_PESSOAL) {
            it(`${fonte} / ${modo}`, () => {
                const itens = montar();
                const tipoId = (b) => ids(b.ids);
                const seculos = agregarTextosPorSeculo(fonte, db.poemas, modo);
                seculos.itens.forEach((b) => {
                    const q = consultaDeDataDaBarra(fonte, intervaloDoSeculo(b.chave), modo);
                    assert.deepEqual(ids(filtrarTextos(itens, q)), tipoId(b), `século ${q}`);
                });
                const decadas = agregarTextosPorDecada(fonte, db.poemas, modo);
                decadas.itens.forEach((b) => {
                    const q = consultaDeDataDaBarra(fonte, intervaloDaDecada(b.chave), modo);
                    assert.deepEqual(ids(filtrarTextos(itens, q)), tipoId(b), `década ${q}`);
                });
                const dist = agregarDistanciaDaObra(fonte, db.poemas, modo);
                dist.itens.forEach((b) => {
                    const q = consultaDeDistanciaDaFaixa(fonte, b, modo);
                    assert.deepEqual(ids(filtrarTextos(itens, q)), tipoId(b), `distância ${q}`);
                });
            });
        }
    }
});

describe('tela: texto do filtro e clique nas barras', () => {
    const contagem = { total: 7, pessoais: 4 };

    it('descreve cada modo com a contagem', () => {
        assert.match(
            descricaoDoModo('todas', 'obras', contagem),
            /4 entradas de 7 entradas de obras estão marcadas/,
        );
        assert.match(
            descricaoDoModo('sem', 'obras', contagem),
            /Sem as pessoais: 4 entradas .* ficam de fora/,
        );
        assert.match(
            descricaoDoModo('so', 'obras', contagem),
            /Só as pessoais: 4 entradas .* entram\./,
        );
        assert.match(descricaoDoModo('so', 'todas', contagem), /Referências ficam de fora/);
    });

    it('avisa quando nada está marcado e quando a fonte é só Referências', () => {
        assert.match(
            descricaoDoModo('so', 'obras', { total: 3, pessoais: 0 }),
            /Nenhuma entrada de obra está marcada/,
        );
        assert.match(descricaoDoModo('so', 'referencias', contagem), /não têm a marca/);
    });

    it('singular com uma entrada só', () => {
        assert.match(
            descricaoDoModo('so', 'obras', { total: 5, pessoais: 1 }),
            /1 entrada de 5 entradas de obras marcada entra/,
        );
    });

    it('o recorte vazio no "só as pessoais" fala da marca', () => {
        const vazio = { itens: [], comEntradas: 0, comData: 0, semData: 0 };
        assert.match(resumoDosTextosPorData(vazio, 'so'), /marcada como obra pessoal/);
        assert.match(resumoDosTextosPorData(vazio), /entradas dessa fonte/);
        assert.match(
            resumoDaDistancia({ itens: [], textosComEntradas: 0, entradasComDistancia: 0 }, 'so'),
            /marcada como obra pessoal/,
        );
    });

    it('o clique na barra leva o modo para a consulta', () => {
        montar();
        const so = agregarTextosPorSeculo('obras', db.poemas, 'so');
        assert.equal(
            consultaDoCliqueNaBarra('seculo', 'obras', 'séc. XX', so, 'so'),
            'dataobrapessoal:1901..2000',
        );
        assert.equal(
            consultaDoCliqueNaBarra('seculo', 'obras', 'séc. XX', so),
            'dataobra:1901..2000',
        );
        assert.equal(
            consultaDoCliqueNaBarra(
                'distancia',
                'obras',
                '0 a 9 anos',
                { itens: [{ rotulo: '0 a 9 anos', min: 0, max: 9 }] },
                'sem',
            ),
            'distanciaobrapublica:0..9',
        );
    });
});
