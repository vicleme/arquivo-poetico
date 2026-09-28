import { palavrasMaisFrequentes, resumoLinguagem } from './estatisticas-dados.js';
import { renderFiltrosCompartilhados } from './estatisticas-tela-comum.js';
import { db } from './db.js';
import { escapeHtml } from './utils.js';

function popularSeletorLivro() {
    const sel = document.getElementById('est-livro-palavras');
    if (!sel) return '';
    const atual = sel.value;
    const comuns = db.livros.filter((l) => l.tipo !== 'Coletânea');
    const cols = db.livros.filter((l) => l.tipo === 'Coletânea');
    const label = (l) => escapeHtml(l.siglaOficial || l.siglaPessoal || l.titulo);
    sel.innerHTML =
        '<option value="">-- Todo o acervo --</option>' +
        (comuns.length
            ? '<optgroup label="Livros">' +
              comuns.map((l) => `<option value="${l.id}">${label(l)}</option>`).join('') +
              '</optgroup>'
            : '') +
        (cols.length
            ? '<optgroup label="Coletâneas">' +
              cols.map((l) => `<option value="${l.id}">${label(l)} (col.)</option>`).join('') +
              '</optgroup>'
            : '');
    if ([...sel.options].some((o) => o.value === atual)) sel.value = atual;
}

export function renderLinguagem() {
    renderFiltrosCompartilhados();
    popularSeletorLivro();
    const container = document.getElementById('lista-palavras');
    if (!container) return;
    const livroId = document.getElementById('est-livro-palavras')?.value || '';
    const resumo = resumoLinguagem(livroId);
    const contexto = document.getElementById('est-contexto-linguagem');
    if (contexto) {
        const nTextos = resumo.textos.toLocaleString('pt-BR');
        const nPalavras = resumo.palavras.toLocaleString('pt-BR');
        contexto.textContent = `${nTextos} ${resumo.textos === 1 ? 'texto' : 'textos'} analisados · ${nPalavras} palavras`;
    }
    const palavras = palavrasMaisFrequentes(livroId, 40);
    container.innerHTML = palavras.length
        ? palavras
              .map(
                  ([palavra, n], i) => `
        <div class="flex justify-between items-center px-2 py-1 rounded ${i < 3 ? 'bg-blue-50 dark:bg-blue-950' : ''}">
            <span class="text-gray-700 dark:text-slate-200">${escapeHtml(palavra)}</span>
            <span class="text-gray-400 dark:text-slate-500 font-mono text-xs">${n}</span>
        </div>`,
              )
              .join('')
        : '<p class="text-gray-400 dark:text-slate-500 col-span-full">Sem texto suficiente pra analisar ainda.</p>';
}
