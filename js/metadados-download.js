// ============================================================
// metadados-download.js: caixa "Metadados" das opções de download de
// Poemas e Prosas (modal "Ver", painel "⚙️ Ações ▾" da coluna e barra de
// seleção em massa).
//
// Ligada (padrão), o download leva tudo o que leva hoje. Desligada, leva só
// o título e o texto:
//   - .md, .pdf e .docx: o cabeçalho do texto e o bloco Texto, sem as linhas
//     de metadado, sem o que vem depois do texto, sem a legenda de papéis e
//     sem "Comum a todos os textos";
//   - .json: só `tipo`, `titulo` e `texto`;
//   - .csv: só as colunas `titulo` e `texto`.
// A Sonoridade e a Progressão (download-abrangente.js) são caixas à parte:
// marcadas, entram mesmo sem Metadados.
//
// A escolha é um valor só no localStorage ('0' desligada; sem valor vale
// ligada) e as caixas dos três lugares ficam sincronizadas. Só vale para os
// downloads desses três lugares: a aba Exportação tem os próprios filtros.
// ============================================================

const LS_KEY = 'arquivoPoetico_downloadMetadados';

// Marca, num registro já reduzido, que ele leva só título e texto. É um
// símbolo para não aparecer no .json (JSON.stringify ignora símbolos) e
// sobreviver ao spread usado ao acrescentar Sonoridade e Progressão.
export const SOMENTE_TITULO_TEXTO = Symbol.for('arquivoPoetico.somenteTituloTexto');

export function ehSomenteTituloTexto(item) {
    return !!item && item[SOMENTE_TITULO_TEXTO] === true;
}

function lerLS() {
    try {
        return localStorage.getItem(LS_KEY);
    } catch {
        return null;
    }
}

export function downloadComMetadados() {
    return lerLS() !== '0';
}

// Registro mínimo: `tipo` fica para a Importação Aditiva saber se é Poema ou
// Prosa. O texto em si (com cores e formatação) não é mexido.
export function reduzirParaTituloETexto(registro) {
    return {
        tipo: registro.tipo,
        titulo: registro.titulo,
        texto: registro.texto,
        [SOMENTE_TITULO_TEXTO]: true,
    };
}

function sincronizarControles() {
    if (typeof document === 'undefined') return;
    const ativo = downloadComMetadados();
    document.querySelectorAll('.download-metadados-check').forEach((el) => {
        el.checked = ativo;
    });
}

// onchange da caixa.
export function toggleDownloadMetadados(ativo) {
    try {
        localStorage.setItem(LS_KEY, ativo ? '1' : '0');
    } catch (e) {
        console.warn('[metadados-download.js] Não foi possível salvar a preferência:', e);
    }
    sincronizarControles();
}

const TITULO =
    'Marcada, o download leva tudo. Desmarcada, leva só o título e o texto (.md, .pdf, .docx, .json e .csv). A Sonoridade e a Progressão, se marcadas, entram mesmo assim.';

export function renderControleMetadados() {
    return `
        <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap" title="${TITULO}">
            <input type="checkbox" class="download-metadados-check" ${downloadComMetadados() ? 'checked' : ''}
                onchange="toggleDownloadMetadados(this.checked)">
            🏷️ Metadados
        </label>`;
}

// Controle do painel "⚙️ Ações ▾" (Poemas e Prosas); o painel os agrupa.
export function renderMetadadosAcoes() {
    return renderControleMetadados();
}

// Preenche os pontos de montagem (`.metadados-slot`) do HTML estático.
// Idempotente; chamado no carregamento (main.js) e ao abrir o Ver.
export function montarControlesMetadados(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.metadados-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderControleMetadados();
            slot.dataset.montado = '1';
        }
    });
    sincronizarControles();
}
