// ============================================================
// previas-imagem.js: "Exibir prévias" das abas com imagem nos cards
// (Livros, Partes, Seções, Elementos e Autores).
//
// Ligada (padrão), o card mostra a imagem (capa, foto ou página do elemento).
// Desligada, o card fica compacto: sem faixa de imagem, sem espaço cinza de
// "ainda sem imagem" e sem ler a imagem do IndexedDB. O "link da imagem"
// (imagemUrl) continua aparecendo, porque é texto e não ocupa a faixa.
//
// A escolha é por aba e fica guardada neste navegador, num objeto só
// ({ livros: false, ... }). Aba sem valor guardado vale ligada. Em cada aba
// há uma caixa "Exibir prévias" (só dela) e dois atalhos, "Todas" e "Nenhuma",
// que mexem nas cinco de uma vez; as caixas de todas as abas ficam sincronizadas.
//
// Este módulo não desenha lista nenhuma: quem redesenha depois de mudar a
// escolha é render-listas.js (alternarPreviasImagem), que importa daqui.
// ============================================================

const LS_KEY = 'arquivoPoetico_previasImagem';

export const ABAS_PREVIAS = Object.freeze(['livros', 'partes', 'secoes', 'elementos', 'autores']);

function lerEstado() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return {};
        const obj = JSON.parse(raw);
        return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch {
        return {};
    }
}

function gravarEstado(estado) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(estado));
    } catch (e) {
        console.warn('[previas-imagem.js] Não foi possível salvar a preferência:', e);
    }
}

// Sem escolha guardada para a aba, vale ligada. Aba desconhecida também.
export function previasAtivas(aba) {
    return lerEstado()[aba] !== false;
}

export function definirPreviasImagem(aba, ativo) {
    if (!ABAS_PREVIAS.includes(aba)) return;
    const estado = lerEstado();
    // Só o "desligado" é guardado: ligado é o padrão, então a chave some.
    if (ativo) delete estado[aba];
    else estado[aba] = false;
    gravarEstado(estado);
    sincronizarControlesPrevias();
}

export function definirPreviasImagemTodas(ativo) {
    const estado = {};
    if (!ativo) ABAS_PREVIAS.forEach((aba) => (estado[aba] = false));
    gravarEstado(estado);
    sincronizarControlesPrevias();
}

function sincronizarControlesPrevias() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.previas-imagem-check').forEach((el) => {
        el.checked = previasAtivas(el.dataset.aba);
    });
}

const TITULO_PREVIAS =
    'Mostra ou esconde a imagem nos cards desta aba. Desligada, o card fica mais compacto. O link da imagem continua aparecendo.';

export function renderControlePrevias(aba) {
    return `
        <span class="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <label class="inline-flex items-center gap-1.5 font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap" title="${TITULO_PREVIAS}">
                <input type="checkbox" class="previas-imagem-check" data-aba="${aba}" ${previasAtivas(aba) ? 'checked' : ''}
                    onchange="alternarPreviasImagem('${aba}', this.checked)">
                🖼️ Exibir prévias
            </label>
            <span class="inline-flex items-center gap-1 text-gray-500 dark:text-slate-400" title="Vale para as cinco abas com imagem: Livros, Partes, Seções, Elementos e Autores">
                em todas as abas:
                <button type="button" onclick="definirPreviasImagemTodasAbas(true)" class="underline hover:text-blue-600 dark:hover:text-blue-400">ligar</button>
                <button type="button" onclick="definirPreviasImagemTodasAbas(false)" class="underline hover:text-blue-600 dark:hover:text-blue-400">desligar</button>
            </span>
        </span>`;
}

// Preenche os pontos de montagem (`.previas-imagem-slot[data-aba]`) do HTML
// estático. Chamado no carregamento (main.js).
export function montarControlesPrevias(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.previas-imagem-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderControlePrevias(slot.dataset.aba);
            slot.dataset.montado = '1';
        }
    });
    sincronizarControlesPrevias();
}
