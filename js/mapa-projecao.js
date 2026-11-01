// ============================================================
// mapa-projecao.js: lógica pura da projeção Equal Earth (Šavrič, Patterson e
// Jenny, 2018), usada no mapa de calor das origens das obras.
//
// Uma projeção é o jeito de achatar a esfera da Terra num plano. A Equal Earth
// é "de áreas iguais": a área de cada país no desenho é proporcional à real,
// então a cor de um mapa de calor não engana o olho (na Mercator, a Rússia e o
// Canadá parecem muito maiores do que são). Em troca, as formas se esticam um
// pouco, coisa que quase não se nota.
//
// A conta é uma fórmula fechada (sem tabelas nem bibliotecas):
//
//   θ = asin( (√3 / 2) · sen φ )
//   x = 2√3 · λ · cos θ / ( 3 · (9·A4·θ⁸ + 7·A3·θ⁶ + 3·A2·θ² + A1) )
//   y = θ · (A4·θ⁸ + A3·θ⁶ + A2·θ² + A1)
//
// com λ a longitude e φ a latitude, em radianos. O resultado sai em unidades
// do plano (x de -2,7066 a 2,7066; y de -1,3173 a 1,3173), com y para CIMA.
// Quem desenha em tela converte para y para baixo (ver `projetarParaTela`).
// ============================================================

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const RAIZ3 = Math.sqrt(3);

const PARA_RADIANOS = Math.PI / 180;

// Metade da largura e metade da altura do mundo inteiro, no plano da fórmula.
export const METADE_LARGURA = (2 * RAIZ3 * Math.PI) / (3 * A1);
export const METADE_ALTURA = projetarEqualEarth(0, 90)[1];

// Longitude e latitude em GRAUS para [x, y] no plano da fórmula (y para cima).
export function projetarEqualEarth(longitude, latitude) {
    const lambda = Number(longitude) * PARA_RADIANOS;
    const phi = Number(latitude) * PARA_RADIANOS;
    if (!Number.isFinite(lambda) || !Number.isFinite(phi)) return [NaN, NaN];
    const theta = Math.asin((RAIZ3 / 2) * Math.sin(phi));
    const t2 = theta * theta;
    const t6 = t2 * t2 * t2;
    const x =
        (2 * RAIZ3 * lambda * Math.cos(theta)) /
        (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1));
    const y = theta * (A4 * t6 * t2 + A3 * t6 + A2 * t2 + A1);
    return [x, y];
}

// ─── Países que cruzam o meridiano 180 ─────────────────────────

// O mapa corta o mundo no meridiano 180 (a "linha de mudança de data"). Um país
// que a atravessa (Rússia com a Chukotka, Fiji, partes dos Estados Unidos) vem
// com o contorno pulando de longitude 180 para -180, e desenhar isso do jeito
// que vem risca o mapa de ponta a ponta. A correção é dar ao contorno uma
// longitude contínua (somar ou tirar 360 a cada pulo) e depois partir o resultado
// na linha do corte: uma parte fica de cada lado do mapa.
//
// `anel` é uma lista de [longitude, latitude] em graus. Devolve uma lista de
// anéis (um só, se nada cruza o corte; até três, se cruza), todos dentro de
// -180 a 180. Não serve para um anel que envolve um polo (a Antártida).

function longitudesContinuas(anel) {
    const saida = [];
    let deslocamento = 0;
    anel.forEach(([lon, lat], i) => {
        if (i > 0) {
            const salto = lon - anel[i - 1][0];
            if (salto > 180) deslocamento -= 360;
            else if (salto < -180) deslocamento += 360;
        }
        saida.push([lon + deslocamento, lat]);
    });
    return saida;
}

// Sutherland-Hodgman contra uma reta vertical: fica a parte do anel com
// longitude <= limite (`lado` -1) ou >= limite (`lado` 1).
function recortarNaLongitude(anel, limite, lado) {
    const dentro = (p) => (lado < 0 ? p[0] <= limite : p[0] >= limite);
    const saida = [];
    anel.forEach((atual, i) => {
        const anterior = anel[(i + anel.length - 1) % anel.length];
        if (dentro(atual) !== dentro(anterior)) {
            const t = (limite - anterior[0]) / (atual[0] - anterior[0]);
            saida.push([limite, anterior[1] + t * (atual[1] - anterior[1])]);
        }
        if (dentro(atual)) saida.push(atual);
    });
    return saida;
}

export function partirAnelNoMeridiano180(anel) {
    if (!Array.isArray(anel) || anel.length < 3) return [];
    // O GeoJSON repete o primeiro ponto no fim; a conta de recorte não quer isso.
    const aberto = anel.slice();
    const a = aberto[0];
    const z = aberto[aberto.length - 1];
    if (a[0] === z[0] && a[1] === z[1]) aberto.pop();

    const continuo = longitudesContinuas(aberto);
    const longitudes = continuo.map((p) => p[0]);
    const menor = Math.min(...longitudes);
    const maior = Math.max(...longitudes);

    const pecas = [];
    if (maior <= 180 && menor >= -180) {
        pecas.push(continuo);
    } else {
        const meio = recortarNaLongitude(recortarNaLongitude(continuo, 180, -1), -180, 1);
        if (meio.length >= 3) pecas.push(meio);
        if (maior > 180) {
            const leste = recortarNaLongitude(continuo, 180, 1).map(([lon, lat]) => [
                lon - 360,
                lat,
            ]);
            if (leste.length >= 3) pecas.push(leste);
        }
        if (menor < -180) {
            const oeste = recortarNaLongitude(continuo, -180, -1).map(([lon, lat]) => [
                lon + 360,
                lat,
            ]);
            if (oeste.length >= 3) pecas.push(oeste);
        }
    }
    return pecas;
}

// Para desenhar em SVG: o mundo inteiro cabe numa caixa `largura` de largura
// (a altura sai da proporção da projeção) e o y cresce para baixo.
// Devolve `{ projetar, largura, altura }`, em que `projetar(lon, lat)` dá
// [x, y] em unidades de tela, com a origem no canto superior esquerdo.
export function projetarParaTela(largura = 1000) {
    const escala = largura / (2 * METADE_LARGURA);
    const altura = 2 * METADE_ALTURA * escala;
    return {
        largura,
        altura,
        projetar(longitude, latitude) {
            const [x, y] = projetarEqualEarth(longitude, latitude);
            return [(x + METADE_LARGURA) * escala, (METADE_ALTURA - y) * escala];
        },
    };
}
