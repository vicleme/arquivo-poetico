// ============================================================
// estatisticas-tela-valencia.js: painel "Peso dos temas (valência)" na aba
// Temas e Assuntos. Dados em estatisticas-dados-valencia.js.
//
// Sem Chart.js: cada grupo é uma linha com a barra de proporção (agradável,
// neutro, desagradável, ambivalente), o índice e o "quanto isso pesa" (textos,
// ligações, cobertura). Em tabela o número de textos fica sempre à vista, e
// grupo com poucos dados aparece esmaecido.
// ============================================================

import {
    valenciaGeral,
    valenciaPorAutor,
    valenciaPorEixo,
    MINIMO_LIGACOES_CONFIAVEL,
} from './estatisticas-dados-valencia.js';
import { EIXOS_VALENCIA, ROTULOS_EIXO_VALENCIA, getEixoValencia } from './estatisticas-filtros.js';
import { ROTULOS_VALENCIA_TEMA } from './temas.js';
import { montarPainel } from './estatisticas-tela-comum.js';
import { seletorPapelTema } from './estatisticas-tela-temas.js';
import { escapeHtml } from './utils.js';

const CORES_SEGMENTO = {
    agradavel: 'bg-emerald-500',
    neutro: 'bg-gray-400 dark:bg-slate-500',
    desagradavel: 'bg-rose-500',
    ambivalente: 'bg-violet-500',
};
const ORDEM_SEGMENTOS = ['agradavel', 'neutro', 'desagradavel', 'ambivalente'];
const MAXIMO_AUTORES = 15;

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export function formatarIndiceValencia(indice) {
    if (indice == null) return 'n/d';
    return indice.toLocaleString('pt-BR', {
        signDisplay: 'exceptZero',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function barra(g) {
    if (!g.classificados) {
        return '<div class="h-3 flex-1 rounded bg-gray-100 dark:bg-slate-800"></div>';
    }
    const segmentos = ORDEM_SEGMENTOS.filter((v) => g[v] > 0)
        .map(
            (v) =>
                `<div data-segmento="${v}" class="${CORES_SEGMENTO[v]}" style="width: ${(g[v] / g.classificados) * 100}%" title="${ROTULOS_VALENCIA_TEMA[v]}: ${g[v]} (${pct(g[v], g.classificados)}%)"></div>`,
        )
        .join('');
    return `<div class="h-3 flex-1 flex rounded overflow-hidden bg-gray-100 dark:bg-slate-800">${segmentos}</div>`;
}

function linha(g) {
    const textos = `${g.textos} texto${g.textos !== 1 ? 's' : ''}`;
    const cobertura =
        g.cobertura == null ? '' : ` · ${Math.round(g.cobertura * 100)}% com valência`;
    const aviso = g.poucosDados
        ? `<span class="text-amber-600 dark:text-amber-400"> · poucos dados</span>`
        : '';
    return `<div data-grupo-valencia="${escapeHtml(g.rotulo)}" class="py-1.5 border-b border-gray-100 dark:border-slate-800 ${g.poucosDados ? 'opacity-60' : ''}">
    <div class="flex items-center gap-3">
        <span class="w-36 sm:w-44 flex-shrink-0 truncate text-xs text-gray-700 dark:text-slate-200" title="${escapeHtml(g.rotulo)}">${escapeHtml(g.rotulo)}</span>
        ${barra(g)}
        <span data-indice-valencia class="w-12 flex-shrink-0 text-right text-xs font-bold tabular-nums text-gray-700 dark:text-slate-200" title="Índice de -1 (só agradáveis) a +1 (só desagradáveis)">${formatarIndiceValencia(g.indice)}</span>
    </div>
    <p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">${textos} · ${g.ligacoes} ligações${cobertura}${aviso}</p>
</div>`;
}

function legenda() {
    const itens = ORDEM_SEGMENTOS.map(
        (v) =>
            `<span class="inline-flex items-center gap-1"><span class="inline-block w-2.5 h-2.5 rounded-sm ${CORES_SEGMENTO[v]}"></span>${ROTULOS_VALENCIA_TEMA[v]}</span>`,
    ).join('');
    return `<div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-slate-400 mb-1">${itens}</div>`;
}

function seletorEixo() {
    const atual = getEixoValencia();
    return EIXOS_VALENCIA.map(
        (v) =>
            `<button type="button" onclick="definirEixoValencia('${v}')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${atual === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${ROTULOS_EIXO_VALENCIA[v]}</button>`,
    ).join('');
}

const TEXTO_EIXO = {
    ano: 'Pelo ano de escrita; texto sem data fica de fora.',
    periodo:
        'Pelo Período Biográfico da época retratada no texto (um texto com vários períodos conta em cada um), do mais antigo ao mais recente.',
    livro: 'Pelos livros onde o texto aparece (Coletâneas ficam de fora), na ordem do cadastro.',
};

function vazio(mensagem) {
    return `<p class="text-xs text-gray-400 dark:text-slate-500">${mensagem}</p>`;
}

export function renderValencia() {
    if (!document.getElementById('card-valencia-temas')) return;
    montarPainel('painel-valencia-papel', seletorPapelTema());

    const geral = valenciaGeral();
    if (!geral.classificados) {
        montarPainel(
            'painel-valencia-resumo',
            vazio(
                geral.ligacoes
                    ? 'Nenhum tema ligado aos textos contados tem valência ainda. Classifique em Cadastros → Temas (o botão “Aplicar valências sugeridas” dá um primeiro passo).'
                    : 'Nenhum tema ligado aos textos contados.',
            ),
        );
        montarPainel('painel-valencia-autores', '');
        montarPainel('painel-valencia-eixo-botoes', seletorEixo());
        montarPainel('painel-valencia-eixo', '');
        return;
    }

    const semValencia = geral.semValencia
        ? ` ${geral.semValencia} ligaç${geral.semValencia !== 1 ? 'ões' : 'ão'} com tema sem valência ficaram fora da conta.`
        : '';
    montarPainel(
        'painel-valencia-resumo',
        `${legenda()}${linha(geral)}<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1">${Math.round((geral.cobertura || 0) * 100)}% das ligações Tema-texto têm valência.${semValencia}</p>`,
    );

    const autores = valenciaPorAutor().filter((g) => g.classificados > 0);
    const cortados = autores.length - MAXIMO_AUTORES;
    montarPainel(
        'painel-valencia-autores',
        autores.length
            ? autores.slice(0, MAXIMO_AUTORES).map(linha).join('') +
                  (cortados > 0
                      ? `<p class="text-[10px] text-gray-400 mt-1">Mostrando os ${MAXIMO_AUTORES} autores com mais ligações (${cortados} a mais ficaram de fora).</p>`
                      : '')
            : vazio('Nenhum autor com tema classificado.'),
    );

    const eixo = getEixoValencia();
    montarPainel('painel-valencia-eixo-botoes', seletorEixo());
    const texto = document.getElementById('texto-valencia-eixo');
    if (texto) {
        texto.textContent = `${TEXTO_EIXO[eixo]} Grupo com menos de ${MINIMO_LIGACOES_CONFIAVEL} ligações classificadas aparece esmaecido.`;
    }
    const grupos = valenciaPorEixo({ eixo }).filter((g) => g.ligacoes > 0);
    montarPainel(
        'painel-valencia-eixo',
        grupos.length ? grupos.map(linha).join('') : vazio('Nada para mostrar neste eixo.'),
    );
}
