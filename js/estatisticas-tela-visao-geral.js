import { resumoGeral } from './estatisticas-dados.js';
import { renderFiltrosCompartilhados } from './estatisticas-tela-comum.js';
import { escapeHtml } from './utils.js';

export function renderVisaoGeral() {
    renderFiltrosCompartilhados();
    const el = document.getElementById('est-resumo');
    if (!el) return;
    const r = resumoGeral();
    const cartoes = [
        ['Poemas', r.totalPoemas, 'estatisticas-producao'],
        ['Prosas', r.totalProsas, 'estatisticas-producao'],
        ['Palavras (total)', r.totalPalavras.toLocaleString('pt-BR'), 'estatisticas-linguagem'],
        ['Média de palavras/texto', r.mediaPalavras, 'estatisticas-linguagem'],
        ['Ano mais produtivo', r.anoMaisProdutivo, 'estatisticas-producao'],
        ['Livro com mais textos', r.livroComMais, 'estatisticas-producao'],
    ];
    el.innerHTML = cartoes
        .map(
            ([rotulo, valor, destino]) => `
        <button type="button" onclick="abrirAba('${destino}')" class="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center hover:border-blue-400 hover:shadow-sm transition">
            <div class="text-2xl font-black text-blue-700 dark:text-blue-300">${escapeHtml(valor)}</div>
            <div class="text-[10px] uppercase text-gray-400 dark:text-slate-500 font-bold mt-1">${rotulo}</div>
        </button>`,
        )
        .join('');

    const n = document.getElementById('est-completude-resumo');
    if (n) {
        n.innerHTML = `<div class="text-sm text-gray-500 dark:text-slate-400">Use as abas acima para aprofundar a distribuição, temas, pessoas e linguagem. Os números desta visão respeitam os mesmos filtros compartilhados.</div>`;
    }
}
