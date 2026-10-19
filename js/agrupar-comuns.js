// ============================================================
// agrupar-comuns.js — Caixa "Agrupar no topo o que for igual em todos os
// textos" das exportações com vários textos (.md, .pdf e .docx).
//
// Ligada (padrão), as linhas de metadado que todos os textos exportados
// têm com o mesmo valor (Autoria, Fonte, Corrente literária etc.) saem uma
// vez no topo do arquivo, sob "Comum a todos os textos", em vez de se
// repetirem em cada texto (ver exportar-comuns.js). Desligada, cada texto
// leva todas as suas linhas, o que serve a quem copia uma seção solta e
// não quer perder a autoria. .json e .csv não mudam: cada registro continua
// completo.
//
// A escolha fica guardada neste navegador (um valor só, '0' ou '1'; sem
// valor guardado vale ligada) e vale para todos os pontos de exportação. As
// caixas aparecem onde se baixa mais de um texto ("Opções de download" da barra de
// seleção em massa e aba Exportação) e são sincronizadas entre si. Não há caixa
// no painel Ações da coluna, porque o Baixar da linha baixa um texto só.
// ============================================================

const LS_KEY = 'arquivoPoetico_agruparComuns';

function lerLS() {
    try {
        return localStorage.getItem(LS_KEY);
    } catch {
        return null;
    }
}

export function agruparComunsAtivo() {
    return lerLS() !== '0';
}

// `opcoes.agruparComuns` explícito (true ou false) manda; sem ele vale a
// preferência guardada. Usado pelas três saídas (.md, .pdf, .docx).
export function resolverAgruparComuns(opcoes = {}) {
    return typeof opcoes.agruparComuns === 'boolean' ? opcoes.agruparComuns : agruparComunsAtivo();
}

function sincronizarControlesAgruparComuns() {
    if (typeof document === 'undefined') return;
    const ativo = agruparComunsAtivo();
    document.querySelectorAll('.agrupar-comuns-check').forEach((el) => {
        el.checked = ativo;
    });
}

// onchange da caixa.
export function toggleAgruparComuns(ativo) {
    try {
        localStorage.setItem(LS_KEY, ativo ? '1' : '0');
    } catch (e) {
        console.warn('[agrupar-comuns.js] Não foi possível salvar a preferência:', e);
    }
    sincronizarControlesAgruparComuns();
}

const TITULO_AGRUPAR =
    'Nos downloads .md, .pdf e .docx com mais de um texto, as linhas que são iguais em todos os textos (autoria, fonte etc.) saem uma vez no topo, em vez de se repetirem em cada texto. Desmarcada, cada texto leva todas as suas linhas. O .json e o .csv não mudam.';

export function renderControleAgruparComuns() {
    return `
        <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap" title="${TITULO_AGRUPAR}">
            <input type="checkbox" class="agrupar-comuns-check" ${agruparComunsAtivo() ? 'checked' : ''}
                onchange="toggleAgruparComuns(this.checked)">
            🧩 Agrupar no topo (valores comuns)
        </label>`;
}

// Preenche os pontos de montagem (`.agrupar-comuns-slot`) do HTML estático.
// Chamado no carregamento (main.js).
export function montarControlesAgruparComuns(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.agrupar-comuns-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderControleAgruparComuns();
            slot.dataset.montado = '1';
        }
    });
    sincronizarControlesAgruparComuns();
}
