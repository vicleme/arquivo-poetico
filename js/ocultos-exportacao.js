// ============================================================
// ocultos-exportacao.js — Caixa "Incluir dados ocultados" das exportações.
//
// Por padrão, uma exportação por texto (JSON, CSV, Markdown, PDF, DOCX) sai
// SEM a Pessoa oculta e SEM o Período Biográfico oculto (ver montarRegistro,
// exportar.js). Marcar "Incluir dados ocultados" libera os dois de uma vez. A caixa é
// separada do "Download abrangente" e não segue o "Mostrar ocultas" da tela:
// ligar este para olhar a lista não deve mudar o que sai no arquivo.
//
// Persistência é escolha da pessoa, desligada por padrão:
//   • sem "Lembrar", o estado vive só em memória e volta desmarcado a cada
//     recarga da página;
//   • com "Lembrar", o estado da caixa é guardado no navegador e restaurado.
// Em ambos os casos o backup completo continua levando tudo.
//
// Os controles aparecem em vários lugares (painel Ações, barra de seleção em
// massa, modal de Visualização, aba Exportação). Todos usam as mesmas classes
// e são sincronizados entre si.
// ============================================================

const LS_VALOR = 'arquivoPoetico_incluirOcultosExportacao';
const LS_LEMBRAR = 'arquivoPoetico_incluirOcultosLembrar';

function lerLS(chave) {
    try {
        return localStorage.getItem(chave);
    } catch {
        return null;
    }
}

function gravarLS(chave, valor) {
    try {
        if (valor === null) localStorage.removeItem(chave);
        else localStorage.setItem(chave, valor);
    } catch (e) {
        console.warn('[ocultos-exportacao.js] Não foi possível salvar a preferência:', e);
    }
}

let lembrar = lerLS(LS_LEMBRAR) === '1';
let incluir = lembrar && lerLS(LS_VALOR) === '1';

export function incluirOcultosNaExportacao() {
    return incluir;
}

export function lembrarIncluirOcultos() {
    return lembrar;
}

// Só para testes e para recarregar o estado a partir do armazenamento.
export function recarregarEstadoIncluirOcultos() {
    lembrar = lerLS(LS_LEMBRAR) === '1';
    incluir = lembrar && lerLS(LS_VALOR) === '1';
    sincronizarControlesIncluirOcultos();
}

function sincronizarControlesIncluirOcultos() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.incluir-ocultos-check').forEach((el) => {
        el.checked = incluir;
    });
    document.querySelectorAll('.incluir-ocultos-lembrar-check').forEach((el) => {
        el.checked = lembrar;
    });
}

// onchange da caixa "Incluir dados ocultados".
export function toggleIncluirOcultos(ativo) {
    incluir = !!ativo;
    if (lembrar) gravarLS(LS_VALOR, incluir ? '1' : '0');
    sincronizarControlesIncluirOcultos();
}

// onchange da caixa "Lembrar". Ligar guarda o estado atual; desligar apaga o
// valor guardado (a caixa volta desmarcada na próxima recarga).
export function toggleLembrarIncluirOcultos(ativo) {
    lembrar = !!ativo;
    gravarLS(LS_LEMBRAR, lembrar ? '1' : '0');
    gravarLS(LS_VALOR, lembrar ? (incluir ? '1' : '0') : null);
    sincronizarControlesIncluirOcultos();
}

const TITULO_INCLUIR =
    'Pessoas e Períodos Biográficos que você ocultou ficam de fora dos downloads por padrão. Marcada, a exportação leva os dois. O backup completo sempre leva tudo.';
const TITULO_LEMBRAR =
    'Marcada, a escolha de "Dados ocultados" fica guardada neste navegador. Desmarcada, a caixa volta desmarcada a cada recarga da página.';

// HTML dos dois controles (a caixa e o "lembrar"), no mesmo estilo das demais
// caixas de exportação. Usado pelo painel Ações e pelos pontos de montagem
// (`.incluir-ocultos-slot`) do HTML estático.
export function renderControlesIncluirOcultos() {
    return `
        <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer" title="${TITULO_INCLUIR}">
                <input type="checkbox" class="incluir-ocultos-check" ${incluir ? 'checked' : ''}
                    onchange="toggleIncluirOcultos(this.checked)">
                🔒 Dados ocultados
            </label>
            <label class="inline-flex items-center gap-1 text-[11px] font-normal text-gray-500 dark:text-slate-400 cursor-pointer" title="${TITULO_LEMBRAR}">
                <input type="checkbox" class="incluir-ocultos-lembrar-check" ${lembrar ? 'checked' : ''}
                    onchange="toggleLembrarIncluirOcultos(this.checked)">
                lembrar
            </label>
        </span>`;
}

// Bloco do painel "⚙️ Ações ▾" (Poemas e Prosas).
export function renderIncluirOcultosAcoes() {
    return `
        <div class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            ${renderControlesIncluirOcultos()}
        </div>`;
}

// Preenche os pontos de montagem do HTML estático. Chamado no carregamento
// (main.js) e de novo quando o modal de Visualização é aberto, porque o modal
// é carregado sob demanda.
export function montarControlesIncluirOcultos(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.incluir-ocultos-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderControlesIncluirOcultos();
            slot.dataset.montado = '1';
        }
    });
    sincronizarControlesIncluirOcultos();
}
