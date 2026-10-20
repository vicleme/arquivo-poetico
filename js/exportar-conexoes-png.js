// ============================================================
// exportar-conexoes-png.js — Monta o desenho do relatório de Conexões
// (entrega 2: .png; a entrega 3, .pdf, reaproveita este mesmo desenho).
//
// Decisão do Victor (19/10/2026): os Elos continuam como cartões, do
// jeito que aparecem na aba hoje (por enquanto só há pares), e os Ecos
// entram com os diagramas que a aba já desenha. Nada de grafo novo.
//
// Módulo puro: não toca o banco nem o DOM. Quem mede texto (canvas) e
// produz o SVG de cada diagrama de Eco é render-conexoes.js, que passa
// `medir` e `diagramasEcos` para cá. Assim a montagem se testa com uma
// função de medida falsa.
// ============================================================

import { resumoConexoes, secoesDoEscopo, TITULOS_CONEXOES } from './exportar-conexoes.js';

const FAMILIA = 'ui-sans-serif, system-ui, sans-serif';
const FONTE_PAGINA = `700 18px ${FAMILIA}`;
const FONTE_RESUMO = `400 11px ${FAMILIA}`;
const FONTE_SECAO = `700 13px ${FAMILIA}`;
const FONTE_NOTA = `400 11px ${FAMILIA}`;
const FONTE_ROTULO_CARTAO = `700 9px ${FAMILIA}`;
const FONTE_TITULO_TEXTO = `600 11px ${FAMILIA}`;
const FONTE_BADGE = `700 9px ${FAMILIA}`;

const LARGURA_MIN = 760;
const MARGEM = 24;
const GAP = 16;
const PAD = 14;
const ALTURA_LINHA = 18;
const ALTURA_BADGE = 14;
const ESPACO = 6;

// Mesmas famílias de cor da aba (Tailwind), já resolvidas por tema,
// porque um <img> com o SVG isolado não enxerga o style.css.
export const PALETA_RELATORIO = {
    claro: {
        fundo: '#ffffff',
        cartaoBorda: '#e5e7eb',
        secao: '#4b5563',
        nota: '#9ca3af',
        texto: '#374151',
        seta: '#d1d5db',
        alerta: '#d97706',
        badgeEloFundo: '#cffafe',
        badgeEloTexto: '#0e7490',
        badgeBuracoFundo: '#dbeafe',
        badgeBuracoTexto: '#1d4ed8',
    },
    escuro: {
        fundo: '#0f172a',
        cartaoBorda: '#334155',
        secao: '#cbd5e1',
        nota: '#64748b',
        texto: '#cbd5e1',
        seta: '#475569',
        alerta: '#fbbf24',
        badgeEloFundo: '#164e63',
        badgeEloTexto: '#67e8f9',
        badgeBuracoFundo: '#1e3a8a',
        badgeBuracoTexto: '#93c5fd',
    },
};

// ─── Limites do canvas ──────────────────────────────────────────
// O Safari do iPhone só aceita canvas de até uns 16,7 milhões de
// pixels, e nenhum navegador passa de uns 16 mil px de lado. Com
// acervo grande o relatório pode ficar comprido: a escala cai de 2x
// para o que couber, e abaixo de 0,5x a imagem sairia ilegível.
export const ESCALA_PADRAO = 2;
export const ESCALA_MINIMA = 0.5;
const LADO_MAX_PX = 16384;
const AREA_MAX_PX = 16_000_000;

// Devolve a escala de exportação, ou null quando nem 0,5x cabe.
export function calcularEscalaExport(largura, altura) {
    if (!(largura > 0) || !(altura > 0)) return null;
    const escala = Math.min(
        ESCALA_PADRAO,
        LADO_MAX_PX / Math.max(largura, altura),
        Math.sqrt(AREA_MAX_PX / (largura * altura)),
    );
    return escala >= ESCALA_MINIMA ? escala : null;
}

// ─── Auxiliares de SVG ──────────────────────────────────────────

function esc(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function n(valor) {
    return Math.round(valor * 100) / 100;
}

function titulo(t) {
    return t && String(t).trim() ? String(t).trim() : '(sem título)';
}

function texto(x, y, conteudo, fonte, cor, extra = '') {
    return `<text x="${n(x)}" y="${n(y)}" style="font: ${fonte};" fill="${cor}"${extra}>${esc(conteudo)}</text>`;
}

function retangulo(x, y, largura, altura, atributos) {
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(largura)}" height="${n(altura)}" ${atributos}></rect>`;
}

// Corta o texto com reticências até caber em `max` px.
function cortar(conteudo, fonte, max, medir) {
    if (medir(conteudo, fonte) <= max) return conteudo;
    let t = conteudo;
    while (t.length > 1 && medir(`${t}…`, fonte) > max) t = t.slice(0, -1).trimEnd();
    return `${t}…`;
}

// ─── Linha de um Elo ou de um buraco ────────────────────────────
// Como na tela: título, selo com o rótulo, seta, título. Cabendo na
// largura, é uma linha só; senão, duas (título e selo, depois seta e
// título), e cada título é cortado com reticências se ainda passar.

function seloSvg(x, y, rotulo, fundo, corTexto, medir) {
    const maiusculo = rotulo.toUpperCase();
    const largura = medir(maiusculo, FONTE_BADGE) + 12;
    const svg =
        retangulo(x, y, largura, ALTURA_BADGE, `rx="3" fill="${fundo}"`) +
        texto(x + 6, y + 10, maiusculo, FONTE_BADGE, corTexto);
    return { svg, largura };
}

function linhaConexao(item, largura, medir, pal) {
    const { esq, rotulo, seta, dir, dirDestaque, nota, tipoSelo } = item;
    const fundo = tipoSelo === 'buraco' ? pal.badgeBuracoFundo : pal.badgeEloFundo;
    const corSelo = tipoSelo === 'buraco' ? pal.badgeBuracoTexto : pal.badgeEloTexto;
    const corDir = dirDestaque ? pal.alerta : pal.texto;

    const larguraSeta = medir(seta, FONTE_TITULO_TEXTO);
    const larguraNota = nota ? medir(nota, FONTE_NOTA) : 0;
    const larguraSelo = rotulo ? medir(rotulo.toUpperCase(), FONTE_BADGE) + 12 : 0;
    const total =
        medir(esq, FONTE_TITULO_TEXTO) +
        (rotulo ? ESPACO + larguraSelo : 0) +
        ESPACO +
        larguraSeta +
        ESPACO +
        medir(dir, FONTE_TITULO_TEXTO) +
        (nota ? ESPACO + larguraNota : 0);

    const partes = [];
    if (total <= largura) {
        let x = 0;
        const base = 13;
        partes.push(texto(x, base, esq, FONTE_TITULO_TEXTO, pal.texto));
        x += medir(esq, FONTE_TITULO_TEXTO) + ESPACO;
        if (rotulo) {
            const selo = seloSvg(x, base - 10, rotulo, fundo, corSelo, medir);
            partes.push(selo.svg);
            x += selo.largura + ESPACO;
        }
        partes.push(texto(x, base, seta, FONTE_TITULO_TEXTO, pal.seta));
        x += larguraSeta + ESPACO;
        partes.push(texto(x, base, dir, FONTE_TITULO_TEXTO, corDir));
        x += medir(dir, FONTE_TITULO_TEXTO) + ESPACO;
        if (nota) partes.push(texto(x, base, nota, FONTE_NOTA, pal.nota, ' font-style="italic"'));
        return { svg: partes.join(''), altura: ALTURA_LINHA };
    }

    // Duas linhas.
    const base1 = 13;
    const base2 = base1 + ALTURA_LINHA;
    const maxEsq = largura - (rotulo ? ESPACO + larguraSelo : 0);
    const esqCortado = cortar(esq, FONTE_TITULO_TEXTO, Math.max(40, maxEsq), medir);
    partes.push(texto(0, base1, esqCortado, FONTE_TITULO_TEXTO, pal.texto));
    if (rotulo) {
        const x = medir(esqCortado, FONTE_TITULO_TEXTO) + ESPACO;
        partes.push(seloSvg(x, base1 - 10, rotulo, fundo, corSelo, medir).svg);
    }
    partes.push(texto(0, base2, seta, FONTE_TITULO_TEXTO, pal.seta));
    const xDir = larguraSeta + ESPACO;
    const dirCortado = cortar(dir, FONTE_TITULO_TEXTO, Math.max(40, largura - xDir), medir);
    partes.push(texto(xDir, base2, dirCortado, FONTE_TITULO_TEXTO, corDir));
    if (nota) {
        const xNota = xDir + medir(dirCortado, FONTE_TITULO_TEXTO) + ESPACO;
        if (xNota + larguraNota <= largura) {
            partes.push(texto(xNota, base2, nota, FONTE_NOTA, pal.nota, ' font-style="italic"'));
        }
    }
    return { svg: partes.join(''), altura: ALTURA_LINHA * 2 };
}

// ─── Cartões ────────────────────────────────────────────────────

// Cartão com um rótulo pequeno em cima e uma lista de linhas. Devolve o
// SVG relativo ao canto do cartão e a altura total.
function cartaoDeLinhas(rotulo, itens, largura, medir, pal) {
    const interna = largura - PAD * 2;
    let y = PAD;
    const partes = [];
    if (rotulo) {
        partes.push(texto(PAD, y + 8, rotulo.toUpperCase(), FONTE_ROTULO_CARTAO, pal.nota));
        y += 18;
    }
    for (const item of itens) {
        const linha = linhaConexao(item, interna, medir, pal);
        partes.push(`<g transform="translate(${PAD},${n(y)})">${linha.svg}</g>`);
        y += linha.altura + 4;
    }
    const altura = y - 4 + PAD;
    const moldura = retangulo(
        0.5,
        0.5,
        largura - 1,
        altura - 1,
        `rx="8" fill="none" stroke="${pal.cartaoBorda}"`,
    );
    return { svg: moldura + partes.join(''), altura };
}

function itemElo(a) {
    return {
        esq: titulo(a.aTitulo),
        rotulo: a.rotulo || '',
        seta: '↔',
        dir: titulo(a.bTitulo),
        tipoSelo: 'elo',
    };
}

function itemBuraco(b) {
    return {
        esq: titulo(b.deTitulo),
        rotulo: b.rotulo || '',
        seta: '→',
        dir: titulo(b.paraTitulo),
        dirDestaque: true,
        nota: '(falta o vínculo de volta)',
        tipoSelo: 'buraco',
    };
}

// ─── Relatório ──────────────────────────────────────────────────

// `diagramasEcos`: um item por grafo de `dados.grafos`, na mesma ordem,
// `{ svg, largura, altura }` (o <svg> do diagrama já com as cores do tema).
// Devolve `{ svg, largura, altura }` do relatório inteiro.
export function montarSvgRelatorio({ dados, escopo = 'tudo', paleta, medir, diagramasEcos = [] }) {
    const e = TITULOS_CONEXOES[escopo] ? escopo : 'tudo';
    const pal = paleta || PALETA_RELATORIO.claro;
    const buracos = dados?.buracos || [];
    const clusters = dados?.clusters || [];
    const grafos = dados?.grafos || [];
    const secoes = secoesDoEscopo(e, dados);

    const maiorDiagrama = Math.max(0, ...diagramasEcos.map((d) => d.largura));
    const conteudoLargura = Math.max(LARGURA_MIN - MARGEM * 2, maiorDiagrama + PAD * 2);
    const largura = conteudoLargura + MARGEM * 2;

    const partes = [];
    // Alturas (y) onde o PDF pode virar a página sem cortar um bloco ao meio:
    // antes de cada seção e entre os cartões. Nunca entre o título de uma seção
    // e o primeiro bloco dela, para o título não ficar sozinho no fim da página.
    const quebras = [];
    let y = MARGEM;

    partes.push(texto(MARGEM, y + 18, TITULOS_CONEXOES[e], FONTE_PAGINA, pal.secao));
    y += 26;
    partes.push(texto(MARGEM, y + 11, resumoConexoes(dados, e), FONTE_RESUMO, pal.nota));
    y += 30;

    const secao = (nome) => {
        quebras.push(y);
        partes.push(texto(MARGEM, y + 12, nome, FONTE_SECAO, pal.secao));
        y += 24;
    };
    const aviso = (mensagem) => {
        partes.push(texto(MARGEM, y + 11, mensagem, FONTE_NOTA, pal.nota));
        y += 28;
    };
    const colocar = (svg, x) => partes.push(`<g transform="translate(${n(x)},${n(y)})">${svg}</g>`);

    if (secoes.buracos) {
        secao('Buracos (Elos com só um lado cadastrado)');
        if (!buracos.length) {
            aviso('Nenhum buraco: todo Elo registrado tem os dois lados.');
        } else {
            const c = cartaoDeLinhas('', buracos.map(itemBuraco), conteudoLargura, medir, pal);
            colocar(c.svg, MARGEM);
            y += c.altura + GAP + 8;
        }
    }

    if (secoes.elos) {
        secao('Elos (pares e clusters)');
        if (!clusters.length) {
            aviso('Nenhum Elo cadastrado ainda.');
        } else {
            const larguraColuna = (conteudoLargura - GAP) / 2;
            const cartoes = clusters.map((cl) =>
                cartaoDeLinhas(
                    cl.tamanho === 2 ? 'Par' : `Cluster (${cl.tamanho} poemas)`,
                    cl.arestas.map(itemElo),
                    larguraColuna,
                    medir,
                    pal,
                ),
            );
            for (let i = 0; i < cartoes.length; i += 2) {
                if (i > 0) quebras.push(y);
                const linha = cartoes.slice(i, i + 2);
                linha.forEach((c, j) => colocar(c.svg, MARGEM + j * (larguraColuna + GAP)));
                y += Math.max(...linha.map((c) => c.altura)) + GAP;
            }
            y += 8;
        }
    }

    if (secoes.ecos) {
        secao('Ecos (cadeias e grafos)');
        if (!grafos.length) {
            aviso('Nenhum Eco cadastrado ainda.');
        } else {
            grafos.forEach((_, i) => {
                const d = diagramasEcos[i];
                if (!d) return;
                if (i > 0) quebras.push(y);
                const altura = d.altura + PAD * 2;
                const moldura = retangulo(
                    0.5,
                    0.5,
                    conteudoLargura - 1,
                    altura - 1,
                    `rx="8" fill="none" stroke="${pal.cartaoBorda}"`,
                );
                colocar(`${moldura}<g transform="translate(${PAD},${PAD})">${d.svg}</g>`, MARGEM);
                y += altura + GAP;
            });
        }
    }

    const altura = Math.ceil(y + MARGEM - GAP);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">` +
        retangulo(0, 0, largura, altura, `fill="${pal.fundo}"`) +
        partes.join('') +
        '</svg>';
    return { svg, largura, altura, quebras };
}
