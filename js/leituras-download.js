// ============================================================
// leituras-download.js: caixa "Leituras" das opções de download de Poemas e
// Prosas (modal "Ver", painel "⚙️ Ações ▾" da coluna e barra de seleção em
// massa).
//
// Ligada, o download de um texto leva junto as leituras avaliativas dele
// (Fase 22), quando existirem: .md, .pdf e .docx ganham o bloco "Leituras
// avaliativas" e o .json ganha a lista `leituras` dentro do texto (a
// Importação Aditiva lê essa lista de volta). O .csv não muda. Desligada
// (padrão), nada disso sai, como acontece com a Sonoridade.
//
// A escolha é um valor só no localStorage ('1' ligada; sem valor vale
// desligada) e as caixas dos três lugares ficam sincronizadas. Vale também
// com a caixa Metadados desmarcada: ligada, as leituras entram mesmo assim.
// ============================================================

const LS_KEY = 'arquivoPoetico_downloadLeituras';

function lerLS() {
    try {
        return localStorage.getItem(LS_KEY);
    } catch {
        return null;
    }
}

export function isDownloadLeiturasAtivo() {
    return lerLS() === '1';
}

function sincronizarControles() {
    if (typeof document === 'undefined') return;
    const ativo = isDownloadLeiturasAtivo();
    document.querySelectorAll('.download-leituras-check').forEach((el) => {
        el.checked = ativo;
    });
}

// onchange da caixa.
export function toggleDownloadLeituras(ativo) {
    try {
        localStorage.setItem(LS_KEY, ativo ? '1' : '0');
    } catch (e) {
        console.warn('[leituras-download.js] Não foi possível salvar a preferência:', e);
    }
    sincronizarControles();
}

const TITULO =
    'Inclui as leituras avaliativas do texto, quando houver (.md, .pdf, .docx e .json; o .csv não muda)';

export function renderControleLeituras() {
    return `
        <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap" title="${TITULO}">
            <input type="checkbox" class="download-leituras-check" ${isDownloadLeiturasAtivo() ? 'checked' : ''}
                onchange="toggleDownloadLeituras(this.checked)">
            📖 Leituras
        </label>`;
}

// Controle do painel "⚙️ Ações ▾" (Poemas e Prosas); o painel os agrupa.
export function renderLeiturasAcoes() {
    return renderControleLeituras();
}

// Preenche os pontos de montagem (`.leituras-slot`) do HTML estático.
// Idempotente; chamado no carregamento (main.js) e ao abrir o Ver.
export function montarControlesLeituras(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.leituras-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderControleLeituras();
            slot.dataset.montado = '1';
        }
    });
    sincronizarControles();
}
