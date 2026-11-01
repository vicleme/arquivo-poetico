// ============================================================
// exportar-cruzamentos.js: exportação da matriz da aba Cruzamentos
// (Estatísticas) em .csv, .json e .md. O .pdf mora em
// exportar-cruzamentos-pdf.js e usa a mesma tabela (`tabelaDeCruzamentos`).
//
// Pedido do Victor (27/10/2026): baixar a matriz Temas × pessoas, grupos ou
// personagens. O arquivo sai exatamente como a tela mostra agora: o modo, a
// matriz invertida ou não, a pessoa escolhida, as colunas exibidas e a ordem
// escolhida pelo clique no cabeçalho.
//
// A lógica é pura: recebe a matriz já calculada e ordenada pela tela
// (`matrizParaExportar`, em estatisticas-tela-cruzamentos.js), então não toca
// o banco nem o DOM. Só `baixarCruzamentos...` (em baixar-cruzamentos.js) baixa.
//
// Entrada (`matriz`):
//   modo        'pessoas' | 'grupos' | 'personagens'
//   invertida   true quando os temas são as linhas
//   rotulosModo { eixo, eixoInvertido, plural, textosCom, somaColuna, descricao }
//   dados       { temas, valores[pessoa][tema], textosPorLinha, textosPorTema }
//   linhas      nomes das linhas da matriz normal (pessoas, grupos ou personagens)
//   contexto    { papelTema, pessoa, soPessoaSozinha, naoAnalisados, ordem }
// ============================================================

import { gerarCsv } from './exportar-csv.js';

export const FORMATOS_CRUZAMENTOS = ['csv', 'json', 'md', 'pdf'];

const NOME_DO_MODO = {
    pessoas: 'temas-pessoas',
    grupos: 'temas-grupos',
    personagens: 'temas-personagens',
};

const TITULO_DO_MODO = {
    pessoas: 'Temas × pessoas',
    grupos: 'Temas × grupos',
    personagens: 'Temas × personagens',
};

export function tituloDeCruzamentos(modo) {
    return TITULO_DO_MODO[modo] || TITULO_DO_MODO.pessoas;
}

export function nomeArquivoCruzamentos(modo, extensao) {
    return `cruzamentos-${NOME_DO_MODO[modo] || NOME_DO_MODO.pessoas}.${extensao}`;
}

const soma = (lista) => lista.reduce((a, b) => a + b, 0);

// A tabela como aparece na tela, na orientação em vigor. Cada linha tem
// `valores` na ordem de `colunas`; `total` é a soma da linha (null quando a
// tela não mostra: Grupos invertido, porque com subgrupos a mesma pessoa
// contaria em dobro). O rodapé segue a tela: soma da coluna (quando existe) e
// a linha "Textos com ...".
export function tabelaDeCruzamentos(matriz) {
    const { modo, invertida, rotulosModo, dados, linhas } = matriz;
    const temSoma = Boolean(rotulosModo.somaColuna);
    if (!invertida) {
        const corpo = linhas.map((rotulo, i) => ({
            rotulo,
            valores: dados.valores[i],
            total: soma(dados.valores[i]),
            textos: dados.textosPorLinha[i],
        }));
        const rodape = [];
        if (temSoma) {
            const somas = dados.temas.map((_, j) => soma(dados.valores.map((l) => l[j])));
            rodape.push({ rotulo: rotulosModo.somaColuna, valores: somas, total: soma(somas) });
        }
        rodape.push({
            rotulo: 'Textos com o tema',
            valores: dados.textosPorTema,
            total: null,
        });
        return {
            modo,
            invertida,
            eixo: rotulosModo.eixo,
            colunas: dados.temas,
            totalRotulo: 'Total (soma da linha)',
            textosRotulo: rotulosModo.textosCom,
            linhas: corpo,
            rodape,
        };
    }
    const corpo = dados.temas.map((rotulo, j) => {
        const valores = linhas.map((_, i) => dados.valores[i][j]);
        return {
            rotulo,
            valores,
            total: temSoma ? soma(valores) : null,
            textos: dados.textosPorTema[j],
        };
    });
    const somas = linhas.map((_, i) => soma(dados.valores[i]));
    const rodape = [
        {
            rotulo: 'Total (soma da coluna)',
            valores: somas,
            total: temSoma ? soma(somas) : null,
        },
        { rotulo: rotulosModo.textosCom, valores: dados.textosPorLinha, total: null },
    ];
    return {
        modo,
        invertida,
        eixo: rotulosModo.eixoInvertido,
        colunas: linhas,
        totalRotulo: temSoma ? 'Total (soma da linha)' : null,
        textosRotulo: 'Textos com o tema',
        linhas: corpo,
        rodape,
    };
}

const ROTULOS_ORDEM = {
    rotulo: 'nome da linha',
    total: 'soma da linha',
    textos: 'textos com a linha',
};

// Descreve a ordem escolhida na tela, ou null (ordem de sempre).
export function textoDaOrdemDeCruzamentos(tabela, ordem) {
    if (!ordem) return null;
    if (ordem.campo === 'col') {
        if (ordem.invertida !== tabela.invertida || !tabela.colunas.includes(ordem.nome)) {
            return null;
        }
    }
    const campo =
        ordem.campo === 'col'
            ? `coluna ${ordem.nome}`
            : ordem.campo === 'textos'
              ? tabela.textosRotulo
              : ROTULOS_ORDEM[ordem.campo];
    if (!campo) return null;
    const sentido =
        ordem.campo === 'rotulo'
            ? ordem.direcao === 'asc'
                ? 'A a Z'
                : 'Z a A'
            : ordem.direcao === 'asc'
              ? 'do menor para o maior'
              : 'do maior para o menor';
    return `${campo}, ${sentido}`;
}

// Os recortes que a tela aplicava quando o arquivo foi gerado, em pares
// [nome, valor], só com o que vale para o modo.
export function filtrosDeCruzamentos(matriz) {
    const { modo, contexto = {} } = matriz;
    const pares = [];
    if (contexto.papelTema) pares.push(['Papel do tema', contexto.papelTema]);
    if (modo === 'pessoas') {
        pares.push(['Pessoa', contexto.pessoa || 'Todas as pessoas']);
        if (contexto.pessoa) {
            pares.push([
                'Só textos em que ela é a única pessoa',
                contexto.soPessoaSozinha ? 'Sim' : 'Não',
            ]);
        }
    }
    if (modo !== 'personagens' && contexto.naoAnalisados) {
        pares.push([
            'Textos não analisados',
            contexto.naoAnalisados === 'excluir'
                ? 'Deixar de fora'
                : 'Contar para todas as pessoas',
        ]);
    }
    return pares;
}

// ─── .csv ───────────────────────────────────────────────────────
// Uma tabela só, como na tela: cabeçalho, linhas e rodapé. As células de
// totais que a tela deixa em branco saem vazias.

export function gerarCsvCruzamentos(matriz) {
    const t = tabelaDeCruzamentos(matriz);
    const colunas = [
        { cabecalho: t.eixo, valor: (r) => r.rotulo },
        ...t.colunas.map((nome, i) => ({ cabecalho: nome, valor: (r) => r.valores[i] })),
    ];
    if (t.totalRotulo) colunas.push({ cabecalho: t.totalRotulo, valor: (r) => r.total });
    colunas.push({ cabecalho: t.textosRotulo, valor: (r) => r.textos });
    return gerarCsv(colunas, [...t.linhas, ...t.rodape.map((r) => ({ ...r, textos: null }))]);
}

// ─── .json ──────────────────────────────────────────────────────

function valoresPorColuna(colunas, valores) {
    const obj = {};
    colunas.forEach((nome, i) => {
        obj[nome] = valores[i];
    });
    return obj;
}

export function gerarJsonCruzamentos(matriz, agora = new Date()) {
    const t = tabelaDeCruzamentos(matriz);
    const filtros = {};
    filtrosDeCruzamentos(matriz).forEach(([nome, valor]) => {
        filtros[nome] = valor;
    });
    const saida = {
        cruzamento: TITULO_DO_MODO[matriz.modo] || TITULO_DO_MODO.pessoas,
        orientacao: t.invertida ? 'temas nas linhas' : 'temas nas colunas',
        geradoEm: agora.toISOString(),
        filtros,
        ordem: textoDaOrdemDeCruzamentos(t, matriz.contexto?.ordem),
        eixo: t.eixo,
        colunas: t.colunas,
        totalRotulo: t.totalRotulo,
        textosRotulo: t.textosRotulo,
        linhas: t.linhas.map((l) => ({
            rotulo: l.rotulo,
            valores: valoresPorColuna(t.colunas, l.valores),
            total: l.total,
            textos: l.textos,
        })),
        rodape: t.rodape.map((r) => ({
            rotulo: r.rotulo,
            valores: valoresPorColuna(t.colunas, r.valores),
            total: r.total,
        })),
    };
    return `${JSON.stringify(saida, null, 2)}\n`;
}

// ─── .md ────────────────────────────────────────────────────────

function celulaMd(valor) {
    return String(valor ?? '')
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ');
}

function numeroMd(v) {
    if (v === null || v === undefined) return '';
    return v === 0 ? '—' : String(v);
}

export function gerarMarkdownCruzamentos(matriz) {
    const t = tabelaDeCruzamentos(matriz);
    const cab = [t.eixo, ...t.colunas, ...(t.totalRotulo ? [t.totalRotulo] : []), t.textosRotulo];
    const linhaMd = (celulas) => `| ${celulas.map(celulaMd).join(' | ')} |`;
    const separador = `| ${cab.map((_, i) => (i === 0 ? '---' : '---:')).join(' | ')} |`;
    const corpo = t.linhas.map((l) =>
        linhaMd([
            l.rotulo,
            ...l.valores.map(numeroMd),
            ...(t.totalRotulo ? [numeroMd(l.total)] : []),
            numeroMd(l.textos),
        ]),
    );
    const rodape = t.rodape.map((r, k) => {
        const ultimo = k === t.rodape.length - 1;
        // A linha de "Textos com ..." é a última do rodapé; a de soma tem total.
        return linhaMd([
            `**${r.rotulo}**`,
            ...r.valores.map(numeroMd),
            ...(t.totalRotulo ? [ultimo ? '' : numeroMd(r.total)] : []),
            '',
        ]);
    });
    const partes = [`# Cruzamentos: ${TITULO_DO_MODO[t.modo] || TITULO_DO_MODO.pessoas}`, ''];
    partes.push(
        t.invertida
            ? 'Matriz invertida: os temas são as linhas.'
            : 'Os temas são as colunas da matriz.',
    );
    const filtros = filtrosDeCruzamentos(matriz);
    const ordem = textoDaOrdemDeCruzamentos(t, matriz.contexto?.ordem);
    if (filtros.length || ordem) {
        partes.push('', '## Recorte', '');
        filtros.forEach(([nome, valor]) => partes.push(`- ${nome}: ${valor}`));
        if (ordem) partes.push(`- Ordem das linhas: ${ordem}`);
    }
    partes.push('', '## Matriz', '', linhaMd(cab), separador, ...corpo, ...rodape);
    partes.push(
        '',
        matriz.rotulosModo.descricao,
        '',
        'Os totais consideram só as linhas e as colunas exibidas. Célula com — não tem texto em comum.',
    );
    return `${partes.join('\n')}\n`;
}
