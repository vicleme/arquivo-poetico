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
    // Só existe na aba Criação (Moldes) — "Promover a Poema" quando o
    // Molde ainda não foi promovido, ou o link pro Poema já promovido
    // (ver celulaAcoesMolde, render-listas.js). Entra na definição
    // geral (mesmo esquema de chave/label de todo o resto) mas fica de
    // fora de ACOES_APLICAVEIS das outras abas, então nunca aparece
    // como checkbox fora de Moldes.
    { key: 'promover', label: 'Promover a Poema' },
];

export const FORMATOS_BAIXAR = [
    { key: 'md', label: '.md (Markdown)' },
    { key: 'pdf', label: '.pdf' },
    { key: 'docx', label: '.docx (Word)' },
    { key: 'json', label: '.json' },
];

const CHAVES_ACOES = DEFINICAO_ACOES.map((a) => a.key);
const CHAVES_FORMATO = FORMATOS_BAIXAR.map((f) => f.key);
const FORMATO_PADRAO = 'md';

// Quais botões cada aba realmente tem — Poemas/Prosas/Sonoridade/
// Morfofuncionalidade usam os 4 clássicos (Ver/Baixar/Editar/Excluir,
// com formato de Baixar configurável); Moldes não tem "Ver" (sem modal
// de visualização somente-leitura), mas tem "Baixar" — sempre .json
// (formato único, ver molde-json.js), por isso entra em
// TABELAS_SEM_FORMATO_BAIXAR abaixo (sem a seção de formato). Sem
// entrada listada aqui cai no padrão dos 4 clássicos (retrocompatível
// com toda aba que já usava este painel antes de 'promover' existir).
const ACOES_APLICAVEIS = {
    moldes: ['baixar', 'editar', 'promover', 'excluir'],
};
// Abas cujo Baixar tem um único formato fixo — o seletor "Formato do
// Baixar" não faz sentido nelas.
const TABELAS_SEM_FORMATO_BAIXAR = ['moldes'];
const ACOES_APLICAVEIS_PADRAO = ['ver', 'baixar', 'editar', 'excluir'];

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
    const aplicaveis = new Set(ACOES_APLICAVEIS[tabela] || ACOES_APLICAVEIS_PADRAO);

    const botoes = DEFINICAO_ACOES.filter((a) => aplicaveis.has(a.key))
        .map(
            (a) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="checkbox" ${setAtivas.has(a.key) ? 'checked' : ''}
                onchange="toggleAcaoColuna('${tabela}', '${a.key}', this.checked)">
            ${a.label}
        </label>`,
        )
        .join('');

    // Formato do Baixar só faz sentido pra abas que têm o botão Baixar
    // COM escolha de formato (Poemas/Prosas/Sonoridade/
    // Morfofuncionalidade) — Moldes só baixa .json, então a seção
    // inteira some pra ela.
    const formatos =
        aplicaveis.has('baixar') && !TABELAS_SEM_FORMATO_BAIXAR.includes(tabela)
            ? `
            <div>
                <p class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-1">
                    Formato do Baixar
                </p>
                <div class="flex flex-wrap gap-x-4">${FORMATOS_BAIXAR.map(
                    (f) => `
        <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
            <input type="radio" name="formato-baixar-${tabela}" ${formato === f.key ? 'checked' : ''}
                onchange="setFormatoBaixarColuna('${tabela}', '${f.key}')">
            ${f.label}
        </label>`,
                ).join('')}</div>
            </div>`
            : '';

    return `
        <div class="flex flex-wrap items-start gap-x-8 gap-y-2">
            <div>
                <p class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-1">
                    Botões na coluna Ações
                </p>
                <div class="flex flex-wrap gap-x-4">${botoes}</div>
            </div>
            ${formatos}
            <button type="button" onclick="resetarAcoesColuna('${tabela}')"
                title="Volta pro padrão de fábrica, descartando a personalização"
                class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 hover:underline self-start mt-4">
                Restaurar padrão
            </button>
        </div>`;
}
