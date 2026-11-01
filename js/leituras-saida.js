// ============================================================
// leituras-saida.js: como as leituras avaliativas (Fase 22) aparecem nas
// saídas de um texto: o bloco do .md/.docx/.pdf e o bloco do modal "Ver".
// Funções puras, sem DOM e sem db: recebem a lista de leituras do texto
// (a mais recente primeiro, como getLeiturasDoTexto devolve).
//
// As duas saídas partilham `linhasDaLeitura`, para o texto nunca divergir.
// O .json leva a leitura inteira (ver download-abrangente.js) e o .csv não
// muda. As leituras só saem com a caixa "Leituras" ligada (leituras-download.js),
// como a Sonoridade.
// ============================================================

import {
    ITENS_PEGOU,
    PESOS,
    RESPOSTAS,
    rotuloItemIncomodou,
    rotuloItemPegou,
    valorDoPeso,
} from './leitura-avaliativa.js';

function rotuloPeso(id) {
    return (PESOS.find((p) => p.id === id)?.rotulo || id).toLowerCase();
}

function rotuloResposta(id) {
    return RESPOSTAS.find((r) => r.id === id)?.rotulo || '';
}

function numeroPtBr(n) {
    return String(n).replace('.', ',');
}

// AAAA-MM-DD para DD/MM/AAAA; qualquer outra coisa volta como veio.
export function dataDaLeitura(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}

// "Voz (central), Imagem (marcante)": do peso maior para o menor e, no mesmo
// peso, na ordem da lista de fábrica.
function textoPegou(pegou) {
    const ordemFabrica = new Map(ITENS_PEGOU.map((i, n) => [i.id, n]));
    return [...(Array.isArray(pegou) ? pegou : [])]
        .sort(
            (a, b) =>
                valorDoPeso(b.peso) - valorDoPeso(a.peso) ||
                (ordemFabrica.get(a.item) ?? 99) - (ordemFabrica.get(b.item) ?? 99),
        )
        .map((m) => `${rotuloItemPegou(m.item) || m.item} (${rotuloPeso(m.peso)})`)
        .join(', ');
}

function textoIncomodou(incomodou) {
    return (Array.isArray(incomodou) ? incomodou : [])
        .map((id) => rotuloItemIncomodou(id) || id)
        .join(', ');
}

// "4 (sugeridos 3,5)", "sem escolha (sugeridos 3,5)" ou "" quando não há nada.
function textoCoracoes(leitura) {
    const escolhido = leitura.escolhido;
    const sugerido = leitura.sugerido;
    const tem = (v) => v !== null && v !== undefined && v !== '';
    if (!tem(escolhido) && !tem(sugerido)) return '';
    if (!tem(escolhido)) return `sem escolha (sugeridos ${numeroPtBr(sugerido)})`;
    if (!tem(sugerido) || Number(sugerido) === Number(escolhido)) return numeroPtBr(escolhido);
    return `${numeroPtBr(escolhido)} (sugeridos ${numeroPtBr(sugerido)})`;
}

// [rótulo, valor] das linhas que a leitura preenche, na ordem do formulário.
export function linhasDaLeitura(leitura) {
    const l = leitura && typeof leitura === 'object' ? leitura : {};
    const linhas = [];
    const pegou = textoPegou(l.pegou);
    if (pegou) linhas.push(['De que maneira te pegou', pegou]);
    const incomodou = textoIncomodou(l.incomodou);
    if (incomodou) linhas.push(['O que incomodou', incomodou]);
    if (rotuloResposta(l.releria)) linhas.push(['Releria?', rotuloResposta(l.releria)]);
    if (rotuloResposta(l.mostraria)) {
        linhas.push(['Mostraria a alguém?', rotuloResposta(l.mostraria)]);
    }
    const coracoes = textoCoracoes(l);
    if (coracoes) linhas.push(['Corações', coracoes]);
    return linhas;
}

function tituloDaLeitura(leitura) {
    const data = dataDaLeitura(leitura?.data);
    return data ? `Leitura de ${data}` : 'Leitura';
}

// Bloco do .md, .docx e .pdf. Vazio quando o texto não tem leitura.
export function leiturasParaMarkdown(leituras) {
    const lista = Array.isArray(leituras) ? leituras : [];
    if (!lista.length) return '';
    let md = `## Leituras avaliativas\n\n`;
    lista.forEach((leitura) => {
        md += `### ${tituloDaLeitura(leitura)}\n\n`;
        const linhas = linhasDaLeitura(leitura);
        if (!linhas.length) md += `_Sem respostas registradas._\n\n`;
        linhas.forEach(([rotulo, valor]) => {
            md += `**${rotulo}:** ${valor}\n\n`;
        });
    });
    return md;
}

function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Bloco do modal "Ver" (dentro do grupo "Avaliação pessoal"). Vazio sem leitura.
// A primeira é a mais recente; as demais vêm como histórico logo abaixo.
export function leiturasParaHtml(leituras) {
    const lista = Array.isArray(leituras) ? leituras : [];
    if (!lista.length) return '';
    const itens = lista
        .map((leitura) => {
            const linhas = linhasDaLeitura(leitura);
            const corpo = linhas.length
                ? `<ul class="list-disc list-inside text-sm space-y-0.5">${linhas
                      .map(
                          ([rotulo, valor]) =>
                              `<li><strong>${escaparHtml(rotulo)}:</strong> ${escaparHtml(valor)}</li>`,
                      )
                      .join('')}</ul>`
                : `<p class="text-sm italic text-gray-500 dark:text-slate-400">Sem respostas registradas.</p>`;
            return `<div class="mt-2"><div class="text-sm font-semibold">${escaparHtml(tituloDaLeitura(leitura))}</div>${corpo}</div>`;
        })
        .join('');
    const rotulo =
        lista.length === 1 ? 'Leitura avaliativa' : `Leituras avaliativas (${lista.length})`;
    return `<h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1">${escaparHtml(rotulo)}</h4>${itens}`;
}
