// ============================================================
// leitura-avaliativa-graficos.js: as séries dos quatro gráficos da tela
// "Leituras" das Estatísticas (Fase 22, entrega 4b; F22-D25 e F22-D26).
// Puro: sem DOM e sem Chart.js; recebe o resultado de `calcularPadrao` e
// devolve só números e rótulos. A tela escolhe cores e desenha.
//
// Ordem dos gráficos (F22-D26, escolha (h)): Contraste, peso por faixa, o que
// incomodou em proporção da faixa, releria e mostraria.
//
// Regras para a amostra pequena não mentir:
//   - o n de cada faixa vai no rótulo da série (`rotuloComN`);
//   - faixa sem nenhum texto é OMITIDA, nunca vira zero: zero diria "ninguém
//     marcou" quando o certo é "não há texto";
//   - "incomodou" é proporção da faixa, com "x de n" na legenda, porque as
//     faixas têm tamanhos diferentes e a contagem bruta enganaria;
//   - em "releria" e "mostraria", a proporção é sobre quem respondeu; faixa
//     em que ninguém respondeu sai desse gráfico.
// ============================================================

import { ITENS_PEGOU, ITENS_INCOMODOU, RESPOSTAS } from './leitura-avaliativa.js';

const arredondar1 = (n) => Math.round(n * 10) / 10;

function faixasComTexto(padrao) {
    return (padrao?.faixas || []).filter((f) => f.n > 0);
}

function faixasOmitidas(padrao) {
    return (padrao?.faixas || []).filter((f) => f.n === 0).map((f) => f.id);
}

// "4 a 5 corações (n = 3)": o n escrito no próprio gráfico.
export function rotuloComN(faixa) {
    return `${faixa.rotulo} (n = ${faixa.n})`;
}

// 1. Contraste: faixa alta menos faixa baixa, barras divergentes, do maior para
// o menor. Só existe com as duas faixas (o `calcularPadrao` já devolve `[]`
// sem elas); a tela mostra `motivo` no lugar do gráfico.
export function graficoContraste(padrao) {
    const alta = padrao?.faixas?.find((f) => f.id === 'alta');
    const baixa = padrao?.faixas?.find((f) => f.id === 'baixa');
    const itens = Array.isArray(padrao?.contraste) ? padrao.contraste : [];
    if (!itens.length) {
        const falta = [!alta?.n && 'a faixa alta', !baixa?.n && 'a faixa baixa'].filter(Boolean);
        return {
            disponivel: false,
            motivo: falta.length
                ? `O contraste precisa de textos nas duas faixas. Falta ${falta.join(' e ')}.`
                : 'Sem dados para o contraste.',
            nAlta: alta?.n || 0,
            nBaixa: baixa?.n || 0,
            rotulos: [],
            valores: [],
        };
    }
    return {
        disponivel: true,
        motivo: '',
        nAlta: alta.n,
        nBaixa: baixa.n,
        rotulos: itens.map((i) => i.rotulo),
        itens: itens.map((i) => i.item),
        valores: itens.map((i) => i.diferenca),
    };
}

// 2. Peso médio por faixa ("ponderado": quem não marcou conta 0, de 0 a 3):
// barras horizontais agrupadas, um item por grupo, uma série por faixa.
export function graficoPesoPorFaixa(padrao) {
    const faixas = faixasComTexto(padrao);
    return {
        disponivel: faixas.length > 0,
        itens: ITENS_PEGOU.map((i) => i.id),
        rotulos: ITENS_PEGOU.map((i) => i.rotulo),
        series: faixas.map((f) => ({
            faixa: f.id,
            rotulo: f.rotulo,
            n: f.n,
            rotuloComN: rotuloComN(f),
            valores: ITENS_PEGOU.map((i) => f.pegou.find((p) => p.item === i.id)?.ponderado ?? 0),
        })),
        omitidas: faixasOmitidas(padrao),
    };
}

// 3. O que incomodou em proporção da faixa (0 a 100), com "x de n" na legenda.
export function graficoIncomodou(padrao) {
    const faixas = faixasComTexto(padrao);
    return {
        disponivel: faixas.length > 0,
        itens: ITENS_INCOMODOU.map((i) => i.id),
        rotulos: ITENS_INCOMODOU.map((i) => i.rotulo),
        series: faixas.map((f) => {
            const marcaram = ITENS_INCOMODOU.map(
                (i) => f.incomodou.find((x) => x.item === i.id)?.marcaram ?? 0,
            );
            return {
                faixa: f.id,
                rotulo: f.rotulo,
                n: f.n,
                rotuloComN: rotuloComN(f),
                marcaram,
                valores: marcaram.map((m) => arredondar1((m / f.n) * 100)),
                legendas: marcaram.map((m) => `${m} de ${f.n}`),
            };
        }),
        omitidas: faixasOmitidas(padrao),
    };
}

// 4. Releria e mostraria: barras 100% empilhadas por faixa (Sim, Talvez, Não),
// sobre quem respondeu. `campo` é 'releria' ou 'mostraria'.
export function graficoResposta(padrao, campo) {
    const faixas = faixasComTexto(padrao).filter((f) => f[campo]?.total > 0);
    return {
        campo,
        disponivel: faixas.length > 0,
        respostas: RESPOSTAS.map((r) => ({ id: r.id, rotulo: r.rotulo })),
        faixas: faixas.map((f) => {
            const r = f[campo];
            const contagens = RESPOSTAS.map((x) => r[x.id]);
            return {
                faixa: f.id,
                rotulo: f.rotulo,
                n: f.n,
                respondidas: r.total,
                rotuloComN: `${f.rotulo} (n = ${f.n}, ${r.total} ${r.total === 1 ? 'resposta' : 'respostas'})`,
                contagens,
                percentuais: contagens.map((c) => arredondar1((c / r.total) * 100)),
            };
        }),
        // Faixa com texto mas sem nenhuma resposta: fica de fora, não vira 0%.
        semResposta: faixasComTexto(padrao)
            .filter((f) => !(f[campo]?.total > 0))
            .map((f) => f.id),
    };
}

// Tudo junto, na ordem da tela, mais os avisos que valem para os quatro.
export function dadosDosGraficos(padrao) {
    return {
        totalTextos: padrao?.totalTextos || 0,
        totalComCoracoes: padrao?.totalComCoracoes || 0,
        semCoracoes: padrao?.semCoracoes || 0,
        poucos: padrao?.poucos ?? true,
        contraste: graficoContraste(padrao),
        pesoPorFaixa: graficoPesoPorFaixa(padrao),
        incomodou: graficoIncomodou(padrao),
        releria: graficoResposta(padrao, 'releria'),
        mostraria: graficoResposta(padrao, 'mostraria'),
        divergencias: padrao?.divergencias?.total || 0,
    };
}
