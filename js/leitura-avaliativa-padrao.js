// ============================================================
// leitura-avaliativa-padrao.js: as contas do "padrão das leituras" (Fase 22,
// entrega 4). Puro: sem DOM e sem db; recebe a lista de leituras.
//
// Pergunta: o que costuma pegar forte nos textos a que o autor deu mais
// corações, e o que incomoda nos de menos?
//
// Regras (escolhas do Claude a confirmar, ver status.md):
//   - Cada texto conta uma vez, pela leitura MAIS RECENTE dele (a opinião
//     atual). Várias leituras do mesmo texto não pesam em dobro.
//   - A faixa vem da Classificação ATUAL do texto (F22-D19), recebida em
//     `opcoes.classificacaoDe(tipo, textoId)`. Sem Classificação, vale o que a
//     leitura mais recente escolheu; sem nenhum dos dois, o texto não entra nas
//     faixas (só é contado em `semCoracoes`). Assim reler um texto só para
//     marcar itens, sem escolher corações, não o tira da faixa.
//   - Faixas: baixa (0,5 a 2), média (2,5 a 3,5) e alta (4 a 5). O corte
//     em 4 é o mesmo do "Só os meus preferidos" do sorteio de leitura.
//   - "Ponderado" de um item de "De que maneira te pegou" = soma dos pesos (pontual 1,
//     marcante 2, central 3; ids leve, forte, centro) das leituras da faixa, dividida pelo nº de leituras da faixa.
//     Quem não marcou o item conta 0. Vai de 0 a 3.
//   - "Contraste" = ponderado da faixa alta menos o da baixa: o que separa os
//     textos que o autor ama dos que gosta menos. Só existe com as duas faixas.
//   - Divergência: leitura em que o escolhido difere do sugerido (a regra
//     simples da sugestão não nomeou algo; ver F22-D9).
// ============================================================

import {
    ITENS_PEGOU,
    ITENS_INCOMODOU,
    RESPOSTAS,
    coracoesValidos,
    limparLeitura,
    temDivergencia,
    ultimaLeitura,
    valorDoPeso,
} from './leitura-avaliativa.js';

export const FAIXAS = Object.freeze([
    { id: 'baixa', rotulo: '0,5 a 2 corações', min: 0.5, max: 2 },
    { id: 'media', rotulo: '2,5 a 3,5 corações', min: 2.5, max: 3.5 },
    { id: 'alta', rotulo: '4 a 5 corações', min: 4, max: 5 },
]);

// Abaixo disso o padrão é indício, não padrão.
export const MINIMO_PARA_PADRAO = 10;

export function faixaDe(coracoes) {
    if (!coracoesValidos(coracoes)) return null;
    const n = Number(coracoes);
    return FAIXAS.find((f) => n >= f.min && n <= f.max)?.id || null;
}

const arredondar = (n) => Math.round(n * 100) / 100;

// Uma leitura por texto (a mais recente), já limpa. `tipo`: 'todos', 'poema' ou 'prosa'.
export function leiturasParaPadrao(leituras, { tipo = 'todos' } = {}) {
    const porTexto = new Map();
    for (const bruta of Array.isArray(leituras) ? leituras : []) {
        const l = limparLeitura(bruta);
        if (l.textoId === null || l.textoId === '') continue;
        if (tipo !== 'todos' && l.tipo !== tipo) continue;
        const chave = `${l.tipo}:${l.textoId}`;
        if (!porTexto.has(chave)) porTexto.set(chave, []);
        porTexto.get(chave).push(l);
    }
    return [...porTexto.values()].map((lista) => ultimaLeitura(lista));
}

function contarRespostas(leiturasDaFaixa, campo) {
    const total = leiturasDaFaixa.filter((l) => l[campo]).length;
    const saida = { total };
    for (const r of RESPOSTAS) {
        saida[r.id] = leiturasDaFaixa.filter((l) => l[campo] === r.id).length;
    }
    return saida;
}

function resumoDaFaixa(faixa, leiturasDaFaixa) {
    const n = leiturasDaFaixa.length;
    const pegou = ITENS_PEGOU.map((item) => {
        const pesos = leiturasDaFaixa
            .map((l) => l.pegou.find((m) => m.item === item.id)?.peso)
            .filter(Boolean)
            .map(valorDoPeso);
        const soma = pesos.reduce((a, b) => a + b, 0);
        return {
            item: item.id,
            rotulo: item.rotulo,
            marcaram: pesos.length,
            ponderado: n ? arredondar(soma / n) : 0,
            mediaPeso: pesos.length ? arredondar(soma / pesos.length) : 0,
        };
    });
    const incomodou = ITENS_INCOMODOU.map((item) => ({
        item: item.id,
        rotulo: item.rotulo,
        marcaram: leiturasDaFaixa.filter((l) => l.incomodou.includes(item.id)).length,
    }));
    return {
        id: faixa.id,
        rotulo: faixa.rotulo,
        n,
        pegou,
        incomodou,
        releria: contarRespostas(leiturasDaFaixa, 'releria'),
        mostraria: contarRespostas(leiturasDaFaixa, 'mostraria'),
    };
}

function resumoDivergencias(leituras) {
    const linhas = leituras
        .filter(temDivergencia)
        .map((l) => ({
            textoId: l.textoId,
            tipo: l.tipo,
            data: l.data,
            sugerido: l.sugerido,
            escolhido: l.escolhido,
            diferenca: arredondar(l.escolhido - l.sugerido),
        }))
        // As maiores diferenças primeiro, em módulo.
        .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));
    const soma = linhas.reduce((acc, l) => acc + l.diferenca, 0);
    return {
        total: linhas.length,
        acima: linhas.filter((l) => l.diferenca > 0).length,
        abaixo: linhas.filter((l) => l.diferenca < 0).length,
        mediaDiferenca: linhas.length ? arredondar(soma / linhas.length) : 0,
        linhas,
    };
}

// Corações que definem a faixa do texto (F22-D19): a Classificação atual dele;
// se não houver, o `escolhido` da leitura; senão null. `classificacaoDe` é
// opcional: sem ela, vale só o `escolhido`, como antes.
export function coracoesDoTexto(leitura, classificacaoDe) {
    if (typeof classificacaoDe === 'function') {
        const atual = classificacaoDe(leitura?.tipo, leitura?.textoId);
        if (coracoesValidos(atual)) return Number(atual);
    }
    return coracoesValidos(leitura?.escolhido) ? Number(leitura.escolhido) : null;
}

export function calcularPadrao(leituras, opcoes = {}) {
    const unicas = leiturasParaPadrao(leituras, opcoes);
    const coracoesDe = (l) => coracoesDoTexto(l, opcoes.classificacaoDe);
    const comCoracoes = unicas.filter((l) => faixaDe(coracoesDe(l)));
    const faixas = FAIXAS.map((f) =>
        resumoDaFaixa(
            f,
            comCoracoes.filter((l) => faixaDe(coracoesDe(l)) === f.id),
        ),
    );
    const baixa = faixas.find((f) => f.id === 'baixa');
    const alta = faixas.find((f) => f.id === 'alta');
    const contraste =
        baixa.n && alta.n
            ? alta.pegou
                  .map((a, i) => ({
                      item: a.item,
                      rotulo: a.rotulo,
                      diferenca: arredondar(a.ponderado - baixa.pegou[i].ponderado),
                  }))
                  .sort((a, b) => b.diferenca - a.diferenca)
            : [];
    return {
        totalTextos: unicas.length,
        totalComCoracoes: comCoracoes.length,
        semCoracoes: unicas.length - comCoracoes.length,
        poucos: comCoracoes.length < MINIMO_PARA_PADRAO,
        faixas,
        contraste,
        divergencias: resumoDivergencias(unicas),
    };
}
