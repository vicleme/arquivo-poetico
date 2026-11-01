// Gera `assets/mapa/mapa-mundi.json`, o mapa-múndi do mapa de calor das origens.
//
// Roda uma vez (e de novo só se a fonte mudar): `node scripts/gerar-mapa-mundi.mjs`.
// Lê os países do pacote `world-atlas` (Natural Earth, escala 1:50 milhões, domínio
// público), projeta cada ponto na Equal Earth (`js/mapa-projecao.js`) e grava os
// contornos já como caminhos de SVG, de modo que o app só pinta: não calcula nada
// de geografia em tempo de execução e continua funcionando offline.
//
// O que sai (um arquivo só):
//
//   {
//     largura, altura,          caixa do SVG (viewBox "0 0 largura altura")
//     paises: [{
//       id,                     o código numérico ISO 3166-1 do país (texto com 3
//                               dígitos) ou, onde a fonte não tem, um código nosso
//                               (ver `CODIGOS_PROPRIOS`)
//       nome,                   o nome em inglês da fonte (só para conferência)
//       d,                      o caminho do SVG
//       area,                   a área desenhada, em unidades de tela ao quadrado
//       centro: [x, y],         o centro da caixa do maior pedaço (para marcadores)
//     }]
//   }
//
// A Antártida fica de fora: não tem origem de obra e ocuparia um quinto do mapa.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { feature } from 'topojson-client';

import { partirAnelNoMeridiano180, projetarParaTela } from '../js/mapa-projecao.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const LARGURA = 1000;
const CASAS = 1; // 1 casa decimal em unidades de tela: sobra para o zoom do mapa

// A fonte não traz o código numérico de alguns territórios, e traz o mesmo
// (036) para a Austrália e para as Ilhas Ashmore e Cartier. Estes recebem um
// código nosso, escolhido pelo nome em inglês da fonte. (As Ashmore e Cartier são
// pequenas demais para a escala do mapa: somem no arredondamento e não saem.)
export const CODIGOS_PROPRIOS = {
    Somaliland: 'SOL',
    Kosovo: 'XKX',
    'N. Cyprus': 'NCY',
    'Indian Ocean Ter.': 'IOT',
    'Siachen Glacier': 'SIA',
    'Ashmore and Cartier Is.': 'ASH',
};

const NOMES_FORA = new Set(['Antarctica']);

function codigoDoPais(f) {
    const proprio = CODIGOS_PROPRIOS[f.properties.name];
    if (proprio) return proprio;
    if (f.id === undefined || f.id === null || f.id === '') {
        throw new Error(`País sem código e sem código próprio: ${f.properties.name}`);
    }
    return String(f.id);
}

function arredondar(n) {
    return Number(n.toFixed(CASAS));
}

// Área (com sinal) de um anel pela fórmula do cadarço.
function areaDoAnel(anel) {
    let soma = 0;
    for (let i = 0; i < anel.length; i += 1) {
        const [x1, y1] = anel[i];
        const [x2, y2] = anel[(i + 1) % anel.length];
        soma += x1 * y2 - x2 * y1;
    }
    return soma / 2;
}

function caixaDoAnel(anel) {
    const xs = anel.map((p) => p[0]);
    const ys = anel.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// Projeta um anel. Um anel que cruza o meridiano 180 vira mais de um (ver
// `partirAnelNoMeridiano180`). Tira os pontos repetidos que o arredondamento cria
// e descarta o que sobra com menos de 3 pontos (não desenharia nada).
function projetarAnel(anel, projetar) {
    return partirAnelNoMeridiano180(anel)
        .map((peca) => {
            const pontos = [];
            peca.forEach(([lon, lat]) => {
                const [x, y] = projetar(lon, lat);
                const p = [arredondar(x), arredondar(y)];
                const anterior = pontos[pontos.length - 1];
                if (!anterior || anterior[0] !== p[0] || anterior[1] !== p[1]) pontos.push(p);
            });
            const a = pontos[0];
            const z = pontos[pontos.length - 1];
            if (pontos.length > 1 && a[0] === z[0] && a[1] === z[1]) pontos.pop();
            return pontos.length >= 3 ? pontos : null;
        })
        .filter(Boolean);
}

function caminhoDoAnel(pontos) {
    return `M${pontos.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
}

function poligonosDe(geometria) {
    if (geometria.type === 'Polygon') return [geometria.coordinates];
    if (geometria.type === 'MultiPolygon') return geometria.coordinates;
    throw new Error(`Geometria inesperada: ${geometria.type}`);
}

export function montarMapaMundi(topologia) {
    const { projetar: projetarSimples, largura, altura } = projetarParaTela(LARGURA);
    const paises = [];
    // Sem a Antártida e sem o Ártico extremo, sobra faixa vazia no alto e embaixo:
    // `vista` é a caixa justa em volta da terra, que a tela usa de viewBox.
    let menorY = Infinity;
    let maiorY = -Infinity;
    const projetar = (lon, lat) => {
        const ponto = projetarSimples(lon, lat);
        menorY = Math.min(menorY, ponto[1]);
        maiorY = Math.max(maiorY, ponto[1]);
        return ponto;
    };

    feature(topologia, topologia.objects.countries).features.forEach((f) => {
        if (NOMES_FORA.has(f.properties.name)) return;

        const caminhos = [];
        let area = 0;
        let maior = null;
        let maiorArea = -1;

        poligonosDe(f.geometry).forEach((aneis) => {
            const externos = projetarAnel(aneis[0], projetar);
            const furos = aneis.slice(1).flatMap((a) => projetarAnel(a, projetar));
            [...externos, ...furos].forEach((anel) => caminhos.push(caminhoDoAnel(anel)));
            // A área é a dos anéis de fora menos a dos furos (lagos, enclaves).
            externos.forEach((anel) => {
                const areaDoAnelDeFora = Math.abs(areaDoAnel(anel));
                area += areaDoAnelDeFora;
                if (areaDoAnelDeFora > maiorArea) {
                    maiorArea = areaDoAnelDeFora;
                    maior = anel;
                }
            });
            furos.forEach((anel) => {
                area -= Math.abs(areaDoAnel(anel));
            });
        });

        if (!caminhos.length) return;
        const [x0, y0, x1, y1] = caixaDoAnel(maior);
        paises.push({
            id: codigoDoPais(f),
            nome: f.properties.name,
            d: caminhos.join(''),
            area: arredondar(area),
            centro: [arredondar((x0 + x1) / 2), arredondar((y0 + y1) / 2)],
        });
    });

    // Ordem estável (por código), para o arquivo gerado não mudar à toa.
    paises.sort((a, b) => a.id.localeCompare(b.id));
    const margem = 4;
    const topo = Math.floor(menorY - margem);
    const base = Math.ceil(maiorY + margem);
    return {
        largura,
        altura: arredondar(altura),
        vista: [0, topo, largura, base - topo],
        paises,
    };
}

// Só roda a geração quando o arquivo é chamado direto (e não importado pelos testes).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const caminhoFonte = require.resolve('world-atlas/countries-50m.json');
    const topologia = JSON.parse(readFileSync(caminhoFonte, 'utf8'));
    const mapa = montarMapaMundi(topologia);
    const destino = resolve(aqui, '../assets/mapa/mapa-mundi.json');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify(mapa));
    process.stdout.write(`${mapa.paises.length} países gravados em ${destino}\n`);
}
