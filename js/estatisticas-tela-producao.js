import {
    contarPorAno,
    contarPorLivro,
    contarPorMesEscrita,
    distribuicaoPorTrimestre,
    sazonalidadePorAno,
    filtrarPorIntervalo,
} from './estatisticas-dados.js';
import {
    getOcultosGrafico,
    filtrarOcultos,
    escapeParaOnclick,
    getMinimoAparicoes,
} from './estatisticas-filtros.js';
import {
    criarBarChart,
    montarPainel,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
    campoMinimoAparicoes,
} from './estatisticas-tela-comum.js';
import { escapeHtml } from './utils.js';
import { db } from './db.js';

function renderOcultos(chave, labels, totalAntesDoCorte) {
    const ocultos = getOcultosGrafico(chave);
    const campoMinimo = campoMinimoAparicoes(chave, totalAntesDoCorte, labels.length);
    if (!labels.length)
        return (
            campoMinimo + '<p class="text-[11px] text-gray-400 px-1">Nada para ocultar ainda.</p>'
        );
    const restaurar = ocultos.size
        ? `<button type="button" onclick="restaurarOcultosGrafico('${chave}')" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline block mb-1.5">Mostrar todos (${ocultos.size})</button>`
        : '';
    return (
        campoMinimo +
        restaurar +
        labels
            .map(
                (label) =>
                    `<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap"><input type="checkbox" ${ocultos.has(label) ? 'checked' : ''} onchange="toggleOcultoItem('${chave}', '${escapeParaOnclick(label)}')">${escapeHtml(label)}</label>`,
            )
            .join('')
    );
}

function renderGrafico(id, base, chave, cor) {
    const cortado = filtrarPorIntervalo(base, getMinimoAparicoes(chave) || '', '');
    const visivel = filtrarOcultos(cortado, getOcultosGrafico(chave));
    criarBarChart(id, visivel.labels, visivel.data, cor);
    montarPainel(
        'painel-ocultos-' + chave,
        renderOcultos(chave, cortado.labels, base.labels.length),
    );
}

function renderTabelaSazonalidade(anos) {
    const el = document.getElementById('tabela-sazonalidade-ano');
    if (!el) return;
    if (!anos.length) {
        el.innerHTML =
            '<p class="text-xs text-gray-400">Ainda não há dados com mês de escrita preenchido para comparar os anos.</p>';
        return;
    }
    el.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-xs">
                <thead><tr class="text-left text-gray-400 dark:text-slate-500 border-b border-gray-200 dark:border-slate-700">
                    <th class="py-2 pr-3">Ano</th><th class="py-2 px-2">N</th><th class="py-2 px-2">1º tri.</th><th class="py-2 px-2">2º tri.</th><th class="py-2 px-2">3º tri.</th><th class="py-2 px-2">4º tri.</th>
                </tr></thead>
                <tbody>${anos
                    .map(
                        (
                            d,
                        ) => `<tr class="border-b border-gray-100 dark:border-slate-800 last:border-0">
                    <td class="py-2 pr-3 font-semibold">${d.ano}</td><td class="py-2 px-2">${d.total}</td>${d.percentuais.map((p) => `<td class="py-2 px-2">${p.toLocaleString('pt-BR')}%</td>`).join('')}
                </tr>`,
                    )
                    .join('')}</tbody>
            </table>
        </div>
        <p class="text-[11px] text-gray-400 dark:text-slate-500 mt-3">Percentuais calculados apenas entre os textos que têm mês de escrita preenchido. N = textos com mês conhecido naquele ano.</p>`;
}

export function renderProducao() {
    renderFiltrosCompartilhados();
    const ano = contarPorAno();
    const livro = contarPorLivro();
    const mes = contarPorMesEscrita();
    const trimestre = distribuicaoPorTrimestre();
    renderGrafico('grafico-ano', ano, 'ano', '#1d4ed8');
    renderGrafico('grafico-livro', livro, 'livro', '#4f46e5');
    renderGrafico('grafico-sazonalidade-mes', mes, 'sazonalidade-mes', '#0f766e');
    renderGrafico('grafico-sazonalidade-trimestre', trimestre, 'sazonalidade-trimestre', '#7c3aed');
    renderTabelaSazonalidade(sazonalidadePorAno());

    const a = document.getElementById('est-drilldown-ajuda');
    if (a)
        a.innerHTML =
            '<span>As barras são clicáveis: ano abre os textos daquele ano; livro abre a lista correspondente.</span>';

    bindDrillDownBarra('grafico-ano', (anoLabel) =>
        navegarParaLista('', '', tipoDestino(), anoLabel),
    );
    bindDrillDownBarra('grafico-livro', (label) => {
        const livro = db.livros.find(
            (l) => (l.siglaOficial || l.siglaPessoal || l.titulo) === label,
        );
        if (!livro) return;
        navegarParaLista('livro:', livro.titulo || label, tipoDestino());
    });
}
