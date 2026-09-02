// ============================================================
// acoes-coluna.js — Configuração da coluna Ações (Ver, Baixar,
// Editar, Excluir) e do formato usado pelo botão Baixar, nas
// tabelas de Poemas e Prosas. Cada tabela guarda sua própria
// escolha no localStorage — mesmo padrão de colunas.js (ver esse
// arquivo pro comentário mais detalhado sobre o formato do estado
// salvo e o motivo de guardar por tabela em vez de global).
// Importado por: render-listas.js, main.js (expõe toggleAcaoColuna,
// setFormatoBaixarColuna e resetarAcoesColuna)
// ============================================================

const LS_PREFIX = 'arquivoPoetico_acoesColuna_';

// Ordem de definição = ordem de exibição dos botões na coluna Ações
// (Ver e Baixar são os dois novos; Editar/Excluir já existiam antes
// dessa configuração e continuam por último, no mesmo lugar de sempre).
export const DEFINICAO_ACOES = [
    { key: 'ver', label: 'Ver' },
    { key: 'baixar', label: 'Baixar' },
    { key: 'editar', label: 'Editar' },
    { key: 'excluir', label: 'Excluir' },
];

export const FORMATOS_BAIXAR = [
    { key: 'md', label: '.md (Markdown)' },
    { key: 'pdf', label: '.pdf' },
    { key: 'json', label: '.json' },
];

const CHAVES_ACOES = DEFINICAO_ACOES.map((a) => a.key);
const CHAVES_FORMATO = FORMATOS_BAIXAR.map((f) => f.key);
const FORMATO_PADRAO = 'md';

// Lê o estado salvo ({ ativas, formato }) e sempre devolve algo
// íntegro: por padrão (primeiro acesso, ou dado salvo corrompido/
// inválido) os 4 botões aparecem e o formato é .md.
function lerEstado(tabela) {
    let ativas = null;
    let formato = null;

    const raw = localStorage.getItem(LS_PREFIX + tabela);
    if (raw) {
        try {
            const salvo = JSON.parse(raw);
            if (salvo && Array.isArray(salvo.ativas)) {
                ativas = salvo.ativas.filter((k) => CHAVES_ACOES.includes(k));
            }
            if (salvo && CHAVES_FORMATO.includes(salvo.formato)) {
                formato = salvo.formato;
            }
        } catch {
            // JSON inválido — cai pro padrão abaixo
        }
    }

    if (!ativas) ativas = [...CHAVES_ACOES];
    if (!formato) formato = FORMATO_PADRAO;

    return { ativas, formato };
}

function salvarEstado(tabela, estado) {
    localStorage.setItem(LS_PREFIX + tabela, JSON.stringify(estado));
}

function disparaAlteracao(tabela) {
    window.dispatchEvent(new CustomEvent('acoes-coluna:alteradas', { detail: { tabela } }));
}

// Botões ativos, na ordem de DEFINICAO_ACOES (essa coluna não tem
// reordenação manual como a de Colunas — só liga/desliga).
export function getAcoesAtivas(tabela) {
    const { ativas } = lerEstado(tabela);
    return CHAVES_ACOES.filter((k) => ativas.includes(k));
}

export function isAcaoAtiva(tabela, key) {
    return getAcoesAtivas(tabela).includes(key);
}

export function getFormatoBaixar(tabela) {
    return lerEstado(tabela).formato;
}

export function toggleAcaoColuna(tabela, key, ativo) {
    if (!CHAVES_ACOES.includes(key)) return;

    const estado = lerEstado(tabela);
    const set = new Set(estado.ativas);
    if (ativo) set.add(key);
    else set.delete(key);
    estado.ativas = CHAVES_ACOES.filter((k) => set.has(k));

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

export function setFormatoBaixarColuna(tabela, formato) {
    if (!CHAVES_FORMATO.includes(formato)) return;

    const estado = lerEstado(tabela);
    estado.formato = formato;

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Descarta a personalização salva e volta pro padrão de fábrica (4
// botões + .md) — mesmo caminho de resetarColunas() em colunas.js.
export function resetarAcoesColuna(tabela) {
    localStorage.removeItem(LS_PREFIX + tabela);
    disparaAlteracao(tabela);
}

// Monta o HTML do painel (usado dentro do popover "⚙️ Ações ▾", ao
// lado do popover "🧱 Colunas ▾" já existente).
export function renderSeletorAcoes(tabela) {
    const { ativas, formato } = lerEstado(tabela);
    const setAtivas = new Set(ativas);

    const botoes = DEFINICAO_ACOES.map(
        (a) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="checkbox" ${setAtivas.has(a.key) ? 'checked' : ''}
                onchange="toggleAcaoColuna('${tabela}', '${a.key}', this.checked)">
            ${a.label}
        </label>`,
    ).join('');

    const formatos = FORMATOS_BAIXAR.map(
        (f) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="radio" name="formato-baixar-${tabela}" ${formato === f.key ? 'checked' : ''}
                onchange="setFormatoBaixarColuna('${tabela}', '${f.key}')">
            ${f.label}
        </label>`,
    ).join('');

    return `
        <div class="flex flex-wrap items-start gap-x-8 gap-y-2">
            <div>
                <p class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-1">
                    Botões na coluna Ações
                </p>
                <div class="flex flex-wrap gap-x-4">${botoes}</div>
            </div>
            <div>
                <p class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-1">
                    Formato do Baixar
                </p>
                <div class="flex flex-wrap gap-x-4">${formatos}</div>
            </div>
            <button type="button" onclick="resetarAcoesColuna('${tabela}')"
                title="Volta pros 4 botões e formato .md, descartando a personalização"
                class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 hover:underline self-start mt-4">
                Restaurar padrão
            </button>
        </div>`;
}
