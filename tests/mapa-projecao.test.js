import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mapa de calor das origens, entrega 1: a projeção Equal Earth (lógica pura).

import {
    METADE_ALTURA,
    METADE_LARGURA,
    partirAnelNoMeridiano180,
    projetarEqualEarth,
    projetarParaTela,
} from '../js/mapa-projecao.js';

const perto = (a, b, tolerancia = 1e-4) =>
    assert.ok(Math.abs(a - b) <= tolerancia, `${a} deveria estar perto de ${b}`);

describe('Equal Earth: pontos conhecidos', () => {
    it('o centro do mapa é a origem', () => {
        assert.deepEqual(projetarEqualEarth(0, 0), [0, 0]);
    });

    it('as pontas do equador ficam em ±2,7066', () => {
        perto(projetarEqualEarth(180, 0)[0], 2.7066, 1e-3);
        perto(projetarEqualEarth(-180, 0)[0], -2.7066, 1e-3);
        perto(METADE_LARGURA, 2.7066, 1e-3);
    });

    it('os polos são uma linha reta (e não um ponto), em ±1,3174', () => {
        perto(projetarEqualEarth(0, 90)[1], 1.3174, 1e-3);
        perto(projetarEqualEarth(0, -90)[1], -1.3174, 1e-3);
        perto(METADE_ALTURA, 1.3174, 1e-3);
        // A linha do polo tem largura: Equal Earth não afunila num ponto.
        assert.ok(projetarEqualEarth(180, 90)[0] > 1);
    });

    it('é simétrica em torno do equador e do meridiano central', () => {
        const [x, y] = projetarEqualEarth(-47.9, -15.8);
        const [x2, y2] = projetarEqualEarth(47.9, 15.8);
        perto(x, -x2, 1e-12);
        perto(y, -y2, 1e-12);
    });

    it('entrada inválida dá NaN, sem estourar', () => {
        const [x, y] = projetarEqualEarth('abc', undefined);
        assert.ok(Number.isNaN(x) && Number.isNaN(y));
    });
});

// Área de um polígono projetado (cadarço), com as bordas subdivididas para a
// curvatura da projeção não se perder.
function areaProjetada(lonA, lonB, latA, latB, passos = 40) {
    const pontos = [];
    const intermedios = (de, ate, fazPonto) => {
        for (let i = 0; i < passos; i += 1) pontos.push(fazPonto(de + ((ate - de) * i) / passos));
    };
    intermedios(lonA, lonB, (lon) => projetarEqualEarth(lon, latA));
    intermedios(latA, latB, (lat) => projetarEqualEarth(lonB, lat));
    intermedios(lonB, lonA, (lon) => projetarEqualEarth(lon, latB));
    intermedios(latB, latA, (lat) => projetarEqualEarth(lonA, lat));
    let soma = 0;
    pontos.forEach(([x1, y1], i) => {
        const [x2, y2] = pontos[(i + 1) % pontos.length];
        soma += x1 * y2 - x2 * y1;
    });
    return Math.abs(soma) / 2;
}

describe('Equal Earth: áreas iguais', () => {
    it('a área desenhada é proporcional à área real na esfera', () => {
        // Na esfera, a área de um trecho de latitude φ1 a φ2 e longitude λ1 a λ2 é
        // proporcional a (sen φ2 - sen φ1) · (λ2 - λ1). A razão entre dois trechos
        // tem que se manter no desenho.
        const real = (lonA, lonB, latA, latB) =>
            (Math.sin((latB * Math.PI) / 180) - Math.sin((latA * Math.PI) / 180)) *
            (((lonB - lonA) * Math.PI) / 180);
        const trechos = [
            [0, 10, 0, 10],
            [60, 70, 40, 50],
            [-120, -100, 60, 70],
            [100, 130, -40, -30],
            [20, 30, 70, 80],
        ];
        const base = areaProjetada(...trechos[0]) / real(...trechos[0]);
        trechos.forEach((t) => {
            perto(areaProjetada(...t) / real(...t) / base, 1, 0.01);
        });
    });
});

describe('Projeção para a tela', () => {
    it('o mundo cabe na largura pedida, com y para baixo', () => {
        const { projetar, largura, altura } = projetarParaTela(1000);
        assert.equal(largura, 1000);
        perto(altura, 486.7, 0.5);
        // O equador vai de ponta a ponta; o polo é uma linha mais curta, no alto.
        const [xe0] = projetar(-180, 0);
        const [xe1, ye1] = projetar(180, 0);
        perto(xe0, 0, 1e-3);
        perto(xe1, 1000, 1e-3);
        perto(ye1, altura / 2, 1e-3);
        const [xp0, yp0] = projetar(-180, 90);
        const [xp1, yp1] = projetar(180, -90);
        perto(yp0, 0, 1e-3);
        perto(yp1, altura, 1e-3);
        assert.ok(xp0 > 100 && xp0 < 500, 'a linha do polo é mais curta que o equador');
        perto(xp0 + xp1, 1000, 1e-3);
        const [xc, yc] = projetar(0, 0);
        perto(xc, 500, 1e-3);
        perto(yc, altura / 2, 1e-3);
    });

    it('o norte fica em cima (y menor)', () => {
        const { projetar } = projetarParaTela();
        assert.ok(projetar(0, 60)[1] < projetar(0, -60)[1]);
    });
});

describe('Anéis que cruzam o meridiano 180', () => {
    const anel = (pontos) => [...pontos, pontos[0]];
    const todasDentro = (pecas) =>
        pecas.every((p) => p.every(([lon]) => lon >= -180 - 1e-9 && lon <= 180 + 1e-9));
    const salto = (peca) =>
        Math.max(...peca.map(([lon], i) => Math.abs(lon - peca[(i + 1) % peca.length][0])));

    it('um anel que não cruza fica como está (sem o ponto repetido do fim)', () => {
        const pecas = partirAnelNoMeridiano180(
            anel([
                [10, 0],
                [20, 0],
                [20, 10],
                [10, 10],
            ]),
        );
        assert.equal(pecas.length, 1);
        assert.deepEqual(pecas[0], [
            [10, 0],
            [20, 0],
            [20, 10],
            [10, 10],
        ]);
    });

    it('um anel que cruza de leste para oeste vira duas peças, uma de cada lado', () => {
        // Uma ilha de 170 a -170 (pulando por 180), como Fiji.
        const pecas = partirAnelNoMeridiano180(
            anel([
                [170, -20],
                [-170, -20],
                [-170, -15],
                [170, -15],
            ]),
        );
        assert.equal(pecas.length, 2);
        assert.ok(todasDentro(pecas));
        pecas.forEach((p) => assert.ok(salto(p) <= 180, 'sem pulo de ponta a ponta'));
        const lados = pecas.map((p) => Math.sign(p[0][0] || p[1][0])).sort();
        assert.deepEqual(lados, [-1, 1]);
    });

    it('funciona também quando o anel começa do lado oeste', () => {
        const pecas = partirAnelNoMeridiano180(
            anel([
                [-175, 60],
                [175, 60],
                [175, 70],
                [-175, 70],
            ]),
        );
        assert.equal(pecas.length, 2);
        assert.ok(todasDentro(pecas));
        pecas.forEach((p) => assert.ok(salto(p) <= 180));
    });

    it('as duas peças somam a área do anel (sem perder nem inventar terra)', () => {
        const pecas = partirAnelNoMeridiano180(
            anel([
                [170, 0],
                [-170, 0],
                [-170, 10],
                [170, 10],
            ]),
        );
        const area = (p) =>
            Math.abs(
                p.reduce((s, [x1, y1], i) => {
                    const [x2, y2] = p[(i + 1) % p.length];
                    return s + (x1 * y2 - x2 * y1);
                }, 0) / 2,
            );
        // O retângulo real tem 20 graus por 10.
        perto(
            pecas.reduce((s, p) => s + area(p), 0),
            200,
            1e-9,
        );
    });

    it('lixo na entrada dá lista vazia', () => {
        assert.deepEqual(partirAnelNoMeridiano180(null), []);
        assert.deepEqual(
            partirAnelNoMeridiano180([
                [0, 0],
                [1, 1],
            ]),
            [],
        );
    });
});
