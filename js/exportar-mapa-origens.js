// ============================================================
// exportar-mapa-origens.js: desenho do mapa de calor das origens para baixar
// (.png e .pdf). Módulo puro: não toca o DOM. Quem mede texto (canvas) é a
// tela, que passa `medir`; assim a montagem se testa com uma medida falsa.
//
// O desenho leva o título, o resumo, o mapa (o mundo todo ou só o enquadramento
// da tela, conforme `vista`), a legenda, a linha "Sem lugar no mapa" e a lista
// dos países com o número de textos (a cor sozinha não diz o valor exato).
// Os auxiliares de SVG vêm do relatório de Conexões, como nos Tag clusters.
// ============================================================

import { cortar, n, retangulo, texto } from './exportar-conexoes-png.js';
import { corDoPais, corDoPaisVazio, degrausDaLegenda, usarEscalaLog } from './mapa-escala.js';
import { PAISES } from './mapa-paises.js';

const FAMILIA = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const FONTE_TITULO = `700 18px ${FAMILIA}`;
const FONTE_RESUMO = `400 11px ${FAMILIA}`;
const FONTE_SECAO = `700 13px ${FAMILIA}`;
const FONTE_LEGENDA = `400 10px ${MONO}`;
const FONTE_LINHA = `400 11px ${FAMILIA}`;

export const LARGURA_MAPA_EXPORTADO = 1000;
const MARGEM = 24;
const COLUNAS = 3;
const ALTURA_LINHA = 16;

export const PALETA_MAPA_ORIGENS = {
    claro: {
        fundo: '#ffffff',
        titulo: '#1f2937',
        nota: '#6b7280',
        moldura: '#e5e7eb',
        contorno: '#ffffff',
    },
    escuro: {
        fundo: '#0f172a',
        titulo: '#f1f5f9',
        nota: '#94a3b8',
        moldura: '#334155',
        contorno: '#0f172a',
    },
};

const plural = (qtd, um, varios) => `${qtd} ${qtd === 1 ? um : varios}`;

// Código do desenho do mapa -> país do app (um país pode pintar mais de um desenho).
export function desenhosPorPais(dados) {
    const porDesenho = new Map();
    dados.paises.forEach((p) => {
        const info = PAISES.find((x) => x.codigo === p.codigo);
        (info?.desenhos || [p.codigo]).forEach((d) => porDesenho.set(d, p));
    });
    return porDesenho;
}

export function resumoDoMapaExportado(dados) {
    return `${plural(dados.textosNoMapa, 'texto', 'textos')} no mapa · ${plural(
        dados.paises.length,
        'país',
        'países',
    )}`;
}

// Sufixo do nome do arquivo: "-enquadrado" quando não é o mundo todo.
export function sufixoDoMapa(enquadrado) {
    return enquadrado ? '-enquadrado' : '';
}

// Quebra uma lista de pedaços em linhas que cabem em `max` px.
function quebrarEmLinhas(pedacos, fonte, max, medir) {
    const linhas = [];
    let atual = '';
    pedacos.forEach((p) => {
        const tentativa = atual ? `${atual}, ${p}` : p;
        if (!atual || medir(tentativa, fonte) <= max) atual = tentativa;
        else {
            linhas.push(`${atual},`);
            atual = p;
        }
    });
    if (atual) linhas.push(atual);
    return linhas.map((l) => cortar(l, fonte, max, medir));
}

export function montarSvgMapaOrigens({
    mapa,
    dados,
    vista = null,
    escuro = false,
    medir,
    filtro = '',
}) {
    const pal = escuro ? PALETA_MAPA_ORIGENS.escuro : PALETA_MAPA_ORIGENS.claro;
    const largura = LARGURA_MAPA_EXPORTADO;
    const conteudo = largura - MARGEM * 2;
    const base = { x: mapa.vista[0], y: mapa.vista[1], w: mapa.vista[2], h: mapa.vista[3] };
    const v = vista || base;
    const log = usarEscalaLog(dados.paises);
    const porDesenho = desenhosPorPais(dados);
    const partes = [];
    const quebras = [];
    let y = MARGEM;

    partes.push(texto(MARGEM, y + 18, 'Textos por origem da obra', FONTE_TITULO, pal.titulo));
    y += 26;
    partes.push(texto(MARGEM, y + 11, resumoDoMapaExportado(dados), FONTE_RESUMO, pal.nota));
    y += 18;
    if (filtro) {
        const linha = cortar(`Filtro: ${filtro}`, FONTE_RESUMO, conteudo, medir);
        partes.push(texto(MARGEM, y + 11, linha, FONTE_RESUMO, pal.nota, ' font-style="italic"'));
        y += 18;
    }
    y += 8;

    // O mapa: um <svg> aninhado, com a vista pedida.
    const alturaMapa = Math.round((conteudo * v.h) / v.w);
    const paths = mapa.paises
        .map((d) => {
            const pais = porDesenho.get(d.id);
            const cor = pais
                ? corDoPais(pais.textos, dados.maximo, { log, escuro })
                : corDoPaisVazio(escuro);
            return `<path d="${d.d}" fill="${cor}" stroke="${pal.contorno}" stroke-width="0.6" vector-effect="non-scaling-stroke"></path>`;
        })
        .join('');
    partes.push(
        retangulo(
            MARGEM - 1,
            y - 1,
            conteudo + 2,
            alturaMapa + 2,
            `fill="none" stroke="${pal.moldura}"`,
        ),
    );
    partes.push(
        `<svg x="${n(MARGEM)}" y="${n(y)}" width="${n(conteudo)}" height="${alturaMapa}" viewBox="${n(v.x)} ${n(v.y)} ${n(v.w)} ${n(v.h)}" preserveAspectRatio="xMidYMid slice" overflow="hidden">${paths}</svg>`,
    );
    y += alturaMapa + 14;

    // Legenda.
    const degraus = degrausDaLegenda(dados.maximo, { log, escuro });
    if (degraus.length) {
        let x = MARGEM;
        partes.push(texto(x, y + 9, 'Textos:', FONTE_LEGENDA, pal.nota));
        x += medir('Textos:', FONTE_LEGENDA) + 10;
        degraus.forEach((d) => {
            partes.push(retangulo(x, y, 14, 10, `rx="2" fill="${d.cor}"`));
            partes.push(texto(x + 18, y + 9, String(d.textos), FONTE_LEGENDA, pal.nota));
            x += 18 + medir(String(d.textos), FONTE_LEGENDA) + 14;
        });
        if (log) partes.push(texto(x, y + 9, '(escala logarítmica)', FONTE_LEGENDA, pal.nota));
        y += 22;
    }

    // Fora do mapa: nada some em silêncio.
    const fora = [];
    if (dados.desconhecida.textos) fora.push(`Desconhecida (${dados.desconhecida.textos})`);
    dados.semLugar.forEach((s) => fora.push(`${s.rotulo} (${s.textos})`));
    if (fora.length) {
        quebras.push(y);
        const total = dados.desconhecida.textos + dados.semLugar.reduce((s, o) => s + o.textos, 0);
        partes.push(
            texto(
                MARGEM,
                y + 12,
                `Sem lugar no mapa (${plural(total, 'texto', 'textos')})`,
                FONTE_SECAO,
                pal.titulo,
            ),
        );
        y += 22;
        quebrarEmLinhas(fora, FONTE_LINHA, conteudo, medir).forEach((linha) => {
            partes.push(texto(MARGEM, y + 11, linha, FONTE_LINHA, pal.nota));
            y += ALTURA_LINHA;
        });
        y += 10;
    }

    // Lista dos países, em colunas, com o número exato.
    if (dados.paises.length) {
        quebras.push(y);
        partes.push(texto(MARGEM, y + 12, 'Textos por país', FONTE_SECAO, pal.titulo));
        y += 24;
        const larguraColuna = conteudo / COLUNAS;
        const porColuna = Math.ceil(dados.paises.length / COLUNAS);
        dados.paises.forEach((p, i) => {
            const col = Math.floor(i / porColuna);
            const lin = i % porColuna;
            const x = MARGEM + col * larguraColuna;
            const yy = y + lin * ALTURA_LINHA;
            const numero = String(p.textos);
            const nome = cortar(p.nome, FONTE_LINHA, larguraColuna - 44, medir);
            partes.push(texto(x, yy + 11, nome, FONTE_LINHA, pal.titulo));
            partes.push(
                texto(
                    x + larguraColuna - 16,
                    yy + 11,
                    numero,
                    FONTE_LEGENDA,
                    pal.nota,
                    ' text-anchor="end"',
                ),
            );
            if (col === 0 && lin > 0 && lin % 10 === 0) quebras.push(yy);
        });
        y += porColuna * ALTURA_LINHA + 4;
    }

    const altura = Math.ceil(y + MARGEM - 8);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">` +
        retangulo(0, 0, largura, altura, `fill="${pal.fundo}"`) +
        partes.join('') +
        '</svg>';
    return { svg, largura, altura, quebras };
}
