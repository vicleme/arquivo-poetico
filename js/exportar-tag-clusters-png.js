// ============================================================
// exportar-tag-clusters-png.js: desenho do relatório da aba Tag clusters
// (entrega 1: .png; a entrega 2, .pdf, reaproveita este mesmo desenho).
//
// O desenho copia o visual da aba: uma seção por categoria (em ordem
// alfabética), cartões em duas colunas, cada cartão com nome, contagens,
// nota e as etiquetas como chips (verde se algum texto usa, cinza se
// nenhum), e os subclusters aninhados dentro do pai. No fim, as
// "Etiquetas sem cluster" por categoria. Como o `.md`, leva o cadastro
// inteiro: não respeita a busca nem o filtro da tela, e não depende de o
// cartão estar recolhido.
//
// Módulo puro: não toca o DOM nem o banco global. Quem mede texto (canvas)
// é a tela, que passa `medir`; assim a montagem se testa com uma medida
// falsa. Os auxiliares de SVG vêm do relatório de Conexões.
// ============================================================

import { ROTULOS_ETIQUETAS, contarTextosPorEtiqueta } from './etiquetas.js';
import {
    CATEGORIAS_EM_ORDEM,
    etiquetasDoCluster,
    etiquetasDoClusterComSub,
    contarTextosPorCluster,
} from './tag-clusters.js';
import { recorteTagClusters } from './selecao-tag-clusters.js';
import { n, texto, retangulo, cortar } from './exportar-conexoes-png.js';

const FAMILIA = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const FONTE_PAGINA = `700 18px ${FAMILIA}`;
const FONTE_RESUMO = `400 11px ${FAMILIA}`;
const FONTE_CATEGORIA = `700 13px ${FAMILIA}`;
const FONTE_CONTAGEM = `400 10px ${MONO}`;
const FONTE_SECAO = `700 14px ${FAMILIA}`;
const FONTE_NOME = `700 14px ${FAMILIA}`;
const FONTE_NOME_SUB = `600 12px ${FAMILIA}`;
const FONTE_META = `400 10px ${MONO}`;
const FONTE_NOTA = `400 11px ${FAMILIA}`;
const FONTE_CHIP = `400 10px ${FAMILIA}`;
const FONTE_CHIP_VAZIA = `italic 400 10px ${FAMILIA}`;

const LARGURA = 840;
const MARGEM = 24;
const GAP = 16;
const PAD = 14;
const ALTURA_CHIP = 16;
const GAP_CHIP = 4;

// Mesmas famílias de cor da aba (Tailwind), já resolvidas por tema, porque
// um <img> com o SVG isolado não enxerga o style.css.
export const PALETA_TAG_CLUSTERS = {
    claro: {
        fundo: '#ffffff',
        cartaoBorda: '#e5e7eb',
        subFundo: '#f9fafb',
        nome: '#1f2937',
        categoria: '#6b7280',
        nota: '#9ca3af',
        textoNota: '#6b7280',
        chipUsadaFundo: '#d1fae5',
        chipUsadaTexto: '#047857',
        chipVaziaFundo: '#e5e7eb',
        chipVaziaTexto: '#9ca3af',
    },
    escuro: {
        fundo: '#0f172a',
        cartaoBorda: '#334155',
        subFundo: '#1e293b',
        nome: '#f1f5f9',
        categoria: '#94a3b8',
        nota: '#64748b',
        textoNota: '#94a3b8',
        chipUsadaFundo: '#064e3b',
        chipUsadaTexto: '#6ee7b7',
        chipVaziaFundo: '#334155',
        chipVaziaTexto: '#94a3b8',
    },
};

const plural = (qtd, um, varios) => `${qtd} ${qtd === 1 ? um : varios}`;

// ─── Dados ──────────────────────────────────────────────────────

// Lê o cadastro e devolve só o que o desenho precisa, já contado e
// ordenado. `dbRef` é o banco (ou um falso, nos testes). `filtro` é o da aba
// (`{ busca, categoria }`, mesma regra da tela) ou `{ selecao }` (Set de
// chaves de `selecao-tag-clusters.js`); sem ele, o cadastro inteiro.
export function dadosTagClusters(dbRef, filtro = {}) {
    const usoEtiquetas = contarTextosPorEtiqueta(dbRef);
    const usoClusters = contarTextosPorCluster(dbRef);
    const itemEtiqueta = (e) => ({ nome: e.nome, textos: usoEtiquetas.get(e.id) || 0 });

    const montar = (c, subs = [], nome = c.nome) => ({
        nome,
        notas: c.notas || '',
        etiquetas: etiquetasDoCluster(dbRef, c.id).map(itemEtiqueta),
        totalEtiquetas: etiquetasDoClusterComSub(dbRef, c.id).length,
        totalTextos: usoClusters.get(c.id) || 0,
        subs: subs.map((sub) => montar(sub)),
    });

    const { arvore, soltas: soltasFiltradas } = recorteTagClusters(dbRef, filtro);
    const categorias = CATEGORIAS_EM_ORDEM.map((categoria) => ({
        categoria,
        rotulo: ROTULOS_ETIQUETAS[categoria],
        clusters: arvore
            .filter((n) => n.categoria === categoria)
            .map((n) => montar(n.topo, n.subs, n.nome)),
        soltas: soltasFiltradas
            .filter((e) => e.categoria === categoria)
            .map(itemEtiqueta)
            .sort((a, b) => b.textos - a.textos || a.nome.localeCompare(b.nome, 'pt-BR')),
    })).filter((c) => c.clusters.length || c.soltas.length);

    const totalClusters = categorias.reduce(
        (soma, c) => soma + c.clusters.reduce((s, cl) => s + 1 + cl.subs.length, 0),
        0,
    );
    const totalSoltas = categorias.reduce((soma, c) => soma + c.soltas.length, 0);
    return { categorias, totalClusters, totalSoltas, filtro: descricaoFiltro(filtro) };
}

// "Busca “x” · categoria Tom" ou "seleção de 3 itens", ou '' sem filtro.
// Entra no topo do relatório, para quem lê saber que o cadastro está
// incompleto de propósito. A seleção vale por si e dispensa busca e categoria.
export function descricaoFiltro({ busca = '', categoria = '', selecao = null } = {}) {
    if (selecao) return `seleção de ${plural(selecao.size, 'item', 'itens')}`;
    const partes = [];
    if (String(busca).trim()) partes.push(`busca “${String(busca).trim()}”`);
    if (categoria) partes.push(`categoria ${ROTULOS_ETIQUETAS[categoria] || categoria}`);
    return partes.join(' · ');
}

// Sufixo do nome do arquivo: "-selecao", "-filtrado" ou nada.
export function sufixoNomeArquivo(filtro = {}) {
    if (filtro.selecao) return '-selecao';
    return descricaoFiltro(filtro) ? '-filtrado' : '';
}

export function resumoTagClusters(dados) {
    return `${plural(dados.totalClusters, 'tag cluster', 'tag clusters')} · ${plural(
        dados.totalSoltas,
        'etiqueta sem cluster',
        'etiquetas sem cluster',
    )}`;
}

// ─── Texto e chips ──────────────────────────────────────────────

// Quebra em linhas que cabem em `max` px. Quebra parágrafos (\n) e corta com
// reticências a palavra que sozinha não cabe. Com `maxLinhas`, a última linha
// leva reticências se sobrar texto.
function quebrar(conteudo, fonte, max, medir, maxLinhas = Infinity) {
    const linhas = [];
    String(conteudo)
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((paragrafo) => {
            let atual = '';
            paragrafo.split(/\s+/).forEach((palavra) => {
                const tentativa = atual ? `${atual} ${palavra}` : palavra;
                if (!atual || medir(tentativa, fonte) <= max) {
                    atual = tentativa;
                } else {
                    linhas.push(atual);
                    atual = palavra;
                }
            });
            if (atual) linhas.push(atual);
        });
    const cabem = linhas.map((l) => cortar(l, fonte, max, medir));
    if (cabem.length <= maxLinhas) return cabem;
    const mantidas = cabem.slice(0, maxLinhas);
    mantidas[maxLinhas - 1] = cortar(`${mantidas[maxLinhas - 1]}…`, fonte, max, medir);
    return mantidas;
}

// Chips lado a lado, quebrando de linha quando não cabem. Devolve o SVG
// (relativo ao canto) e a altura.
function fluxoChips(etiquetas, largura, medir, pal) {
    let x = 0;
    let y = 0;
    const partes = [];
    etiquetas.forEach((e) => {
        const usada = e.textos > 0;
        const fonte = usada ? FONTE_CHIP : FONTE_CHIP_VAZIA;
        const rotulo = cortar(
            usada ? `${e.nome} · ${e.textos}` : e.nome,
            fonte,
            largura - 12,
            medir,
        );
        const w = medir(rotulo, fonte) + 12;
        if (x > 0 && x + w > largura) {
            x = 0;
            y += ALTURA_CHIP + GAP_CHIP;
        }
        partes.push(
            retangulo(
                x,
                y,
                w,
                ALTURA_CHIP,
                `rx="3" fill="${usada ? pal.chipUsadaFundo : pal.chipVaziaFundo}"`,
            ),
            texto(x + 6, y + 11.5, rotulo, fonte, usada ? pal.chipUsadaTexto : pal.chipVaziaTexto),
        );
        x += w + GAP_CHIP;
    });
    return { svg: partes.join(''), altura: etiquetas.length ? y + ALTURA_CHIP : 0 };
}

// ─── Cartões ────────────────────────────────────────────────────

// Cartão de um cluster. O de topo traz os subclusters dentro; o subcluster
// (`aninhado`) tem fundo próprio e fonte menor.
function cartaoCluster(c, largura, medir, pal, aninhado = false) {
    const interna = largura - PAD * 2;
    const fonteNome = aninhado ? FONTE_NOME_SUB : FONTE_NOME;
    const alturaNome = aninhado ? 15 : 17;
    const partes = [];
    let y = PAD;

    const nome = quebrar(c.nome, fonteNome, interna, medir, 3);
    nome.forEach((linha, i) => {
        partes.push(texto(PAD, y + alturaNome - 4 + i * alturaNome, linha, fonteNome, pal.nome));
    });
    y += nome.length * alturaNome + 2;

    const meta = [
        plural(c.totalEtiquetas, 'etiqueta', 'etiquetas'),
        c.subs.length ? plural(c.subs.length, 'subcluster', 'subclusters') : '',
        `aparece em ${plural(c.totalTextos, 'texto', 'textos')}`,
    ]
        .filter(Boolean)
        .join(' · ');
    quebrar(meta, FONTE_META, interna, medir).forEach((linha) => {
        partes.push(texto(PAD, y + 9, linha, FONTE_META, pal.nota));
        y += 13;
    });
    y += 4;

    if (c.notas) {
        quebrar(c.notas, FONTE_NOTA, interna, medir).forEach((linha) => {
            partes.push(texto(PAD, y + 11, linha, FONTE_NOTA, pal.textoNota));
            y += 15;
        });
        y += 4;
    }

    if (c.etiquetas.length) {
        const chips = fluxoChips(c.etiquetas, interna, medir, pal);
        partes.push(`<g transform="translate(${PAD},${n(y)})">${chips.svg}</g>`);
        y += chips.altura;
    } else {
        const aviso = c.subs.length
            ? 'Nenhuma etiqueta direto neste cluster.'
            : 'Nenhuma etiqueta ainda.';
        partes.push(texto(PAD, y + 11, aviso, FONTE_CHIP_VAZIA, pal.nota));
        y += 15;
    }

    c.subs.forEach((sub) => {
        y += 10;
        const cartao = cartaoCluster(sub, interna, medir, pal, true);
        partes.push(`<g transform="translate(${PAD},${n(y)})">${cartao.svg}</g>`);
        y += cartao.altura;
    });

    const altura = y + PAD;
    const moldura = retangulo(
        0.5,
        0.5,
        largura - 1,
        altura - 1,
        `rx="${aninhado ? 6 : 8}" fill="${aninhado ? pal.subFundo : 'none'}" stroke="${pal.cartaoBorda}"`,
    );
    return { svg: moldura + partes.join(''), altura };
}

// Cartão largo com as etiquetas sem cluster de uma categoria.
function cartaoSoltas(categoria, largura, medir, pal) {
    const interna = largura - PAD * 2;
    const rotulo = `${categoria.rotulo.toUpperCase()}  ${categoria.soltas.length}`;
    const chips = fluxoChips(categoria.soltas, interna, medir, pal);
    const altura = PAD + 16 + chips.altura + PAD;
    const moldura = retangulo(
        0.5,
        0.5,
        largura - 1,
        altura - 1,
        `rx="8" fill="none" stroke="${pal.cartaoBorda}"`,
    );
    return {
        svg:
            moldura +
            texto(PAD, PAD + 9, rotulo, FONTE_META, pal.categoria) +
            `<g transform="translate(${PAD},${PAD + 16})">${chips.svg}</g>`,
        altura,
    };
}

// ─── Relatório ──────────────────────────────────────────────────

// Devolve `{ svg, largura, altura, quebras }`. `quebras` são as alturas (y)
// onde o PDF pode virar a página sem cortar um cartão ao meio: antes de cada
// categoria e entre as fileiras de cartões, nunca entre o título e o
// primeiro cartão.
export function montarSvgTagClusters({ dados, paleta, medir }) {
    const pal = paleta || PALETA_TAG_CLUSTERS.claro;
    const largura = LARGURA;
    const conteudo = largura - MARGEM * 2;
    const coluna = (conteudo - GAP) / 2;
    const partes = [];
    const quebras = [];
    let y = MARGEM;
    const colocar = (svg, x) => partes.push(`<g transform="translate(${n(x)},${n(y)})">${svg}</g>`);

    partes.push(texto(MARGEM, y + 18, 'Tag clusters', FONTE_PAGINA, pal.categoria));
    y += 26;
    partes.push(texto(MARGEM, y + 11, resumoTagClusters(dados), FONTE_RESUMO, pal.nota));
    y += dados.filtro ? 18 : 30;
    if (dados.filtro) {
        const linha = cortar(`Filtro: ${dados.filtro}`, FONTE_RESUMO, conteudo, medir);
        partes.push(texto(MARGEM, y + 11, linha, FONTE_RESUMO, pal.nota, ' font-style="italic"'));
        y += 24;
    }

    if (!dados.categorias.length) {
        partes.push(
            texto(
                MARGEM,
                y + 11,
                'Nenhum tag cluster nem etiqueta cadastrados ainda.',
                FONTE_NOTA,
                pal.nota,
            ),
        );
        y += 28;
    }

    dados.categorias.forEach((cat) => {
        if (!cat.clusters.length) return;
        const total = cat.clusters.reduce((s, c) => s + 1 + c.subs.length, 0);
        quebras.push(y);
        const rotulo = cat.rotulo.toUpperCase();
        partes.push(texto(MARGEM, y + 12, rotulo, FONTE_CATEGORIA, pal.categoria));
        partes.push(
            texto(
                MARGEM + medir(rotulo, FONTE_CATEGORIA) + 8,
                y + 12,
                String(total),
                FONTE_CONTAGEM,
                pal.nota,
            ),
        );
        y += 26;
        const cartoes = cat.clusters.map((c) => cartaoCluster(c, coluna, medir, pal));
        for (let i = 0; i < cartoes.length; i += 2) {
            if (i > 0) quebras.push(y);
            const fileira = cartoes.slice(i, i + 2);
            fileira.forEach((c, j) => colocar(c.svg, MARGEM + j * (coluna + GAP)));
            y += Math.max(...fileira.map((c) => c.altura)) + GAP;
        }
        y += 8;
    });

    const comSoltas = dados.categorias.filter((c) => c.soltas.length);
    if (comSoltas.length) {
        quebras.push(y);
        partes.push(texto(MARGEM, y + 13, 'Etiquetas sem cluster', FONTE_SECAO, pal.categoria));
        y += 28;
        comSoltas.forEach((cat, i) => {
            if (i > 0) quebras.push(y);
            const c = cartaoSoltas(cat, conteudo, medir, pal);
            colocar(c.svg, MARGEM);
            y += c.altura + GAP;
        });
    }

    const altura = Math.ceil(y + MARGEM - GAP);
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">` +
        retangulo(0, 0, largura, altura, `fill="${pal.fundo}"`) +
        partes.join('') +
        '</svg>';
    return { svg, largura, altura, quebras };
}
