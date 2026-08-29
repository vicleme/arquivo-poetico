// ============================================================
// colunas.js — Configuração de colunas visíveis (e sua ordem)
// nas tabelas de Poemas e Prosas. Cada tabela guarda sua própria
// escolha no localStorage; colunas não listadas aqui (ID/Título
// e Ações) são fixas e sempre aparecem, sempre nas pontas.
// Importado por: render-listas.js, main.js (expõe toggleColuna
// e moverColuna)
// ============================================================

const LS_PREFIX = 'arquivoPoetico_colunas_';

// Ordem de definição = ordem padrão de exibição (usada só até o
// usuário reordenar manualmente pelo seletor — a partir daí quem
// manda é a ordem salva no localStorage, ver lerEstado()).
// `default: true` são as colunas que já existiam antes desse recurso
// (mantidas ativas de cara); as demais começam desligadas.
// `sortType` só existe nas colunas de Poemas (única tabela com cabeçalho
// clicável por enquanto — ver thOrdenavel() em render-listas.js):
//   'estrutura'  — ordem padrão (array já vem nessa ordem; desc = invertida)
//   'data'       — cronológica (ano/mês/dia, com data parcial/ausente por último)
//   'alfabetico' — texto (localeCompare pt-BR, vazio por último)
//   'status'     — pelos três estados possíveis, ver ORDEM_STATUS
export const DEFINICAO_COLUNAS = {
    poemas: [
        { key: 'dataEscrita', label: 'Escrito em', default: true, sortType: 'data' },
        { key: 'dataPublicacao', label: 'Publicação', default: true, sortType: 'data' },
        { key: 'estrutura', label: 'Estrutura', default: true, sortType: 'estrutura' },
        { key: 'status', label: 'Status', default: true, sortType: 'status' },
        { key: 'pessoas', label: 'Dedicado a', default: true, sortType: 'alfabetico' },
        { key: 'epocaRetratada', label: 'Época Retratada', default: false, sortType: 'data' },
        { key: 'elos', label: 'Elos', default: false, sortType: 'alfabetico' },
        { key: 'referencias', label: 'Referências', default: false, sortType: 'alfabetico' },
        {
            key: 'intertextualidade',
            label: 'Intertextualidade',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'anexos', label: 'Anexos', default: false, sortType: 'alfabetico' },
        {
            key: 'descricaoVisual',
            label: 'Descrição Visual',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'contextoHistorico',
            label: 'Contexto Histórico/Pessoal',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'etiquetas', label: 'Etiquetas', default: false, sortType: 'alfabetico' },
        { key: 'notas', label: 'Notas', default: false, sortType: 'alfabetico' },
        { key: 'ocultacao', label: 'Ocultação', default: false, sortType: 'alfabetico' },
        {
            key: 'conteudoSensivel',
            label: 'Conteúdo Sensível',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'vocabularioHiperacionante',
            label: 'Vocabulário Hiperacionante',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'descarte', label: 'Descarte', default: false, sortType: 'alfabetico' },
        { key: 'cortadoDe', label: 'Cortado de', default: false, sortType: 'alfabetico' },
        { key: 'lancadoEm', label: 'Lançado em', default: false, sortType: 'alfabetico' },
    ],
    prosas: [
        { key: 'dataEscrita', label: 'Data', default: true },
        { key: 'dataPublicacao', label: 'Publicação', default: true },
        { key: 'vinculo', label: 'Vínculo', default: true },
        { key: 'pessoas', label: 'Dedicado a', default: true },
        { key: 'genero', label: 'Gênero', default: true },
        { key: 'etiquetas', label: 'Etiquetas', default: false },
        { key: 'notas', label: 'Notas', default: false },
    ],
};

// Lê o estado salvo ({ ordem, ativas }) e sempre devolve algo íntegro:
// `ordem` contém TODAS as colunas definidas (ativas ou não — a ordem
// entre as desligadas importa pra quando forem religadas depois), sem
// duplicar nem faltar nenhuma; `ativas` é o subconjunto ligado.
function lerEstado(tabela) {
    const def = DEFINICAO_COLUNAS[tabela];
    if (!def) return { ordem: [], ativas: [] };

    const todasChaves = def.map((c) => c.key);
    const chavesValidas = new Set(todasChaves);

    let ordem = null,
        ativas = null;
    const raw = localStorage.getItem(LS_PREFIX + tabela);
    if (raw) {
        try {
            const salvo = JSON.parse(raw);
            if (salvo && Array.isArray(salvo.ordem) && Array.isArray(salvo.ativas)) {
                ordem = salvo.ordem.filter((k) => chavesValidas.has(k));
                ativas = salvo.ativas.filter((k) => chavesValidas.has(k));
            }
        } catch {
            // JSON inválido — cai pro padrão abaixo
        }
    }

    if (!ordem) ordem = [...todasChaves];
    if (!ativas) ativas = def.filter((c) => c.default).map((c) => c.key);

    // Colunas novas (adicionadas a DEFINICAO_COLUNAS depois de já existir
    // uma escolha salva no navegador) entram no fim da ordem, desligadas.
    todasChaves.forEach((k) => {
        if (!ordem.includes(k)) ordem.push(k);
    });

    return { ordem, ativas };
}

function salvarEstado(tabela, estado) {
    localStorage.setItem(LS_PREFIX + tabela, JSON.stringify(estado));
}

function disparaAlteracao(tabela) {
    window.dispatchEvent(new CustomEvent('colunas:alteradas', { detail: { tabela } }));
}

// Colunas ativas, na ordem escolhida pelo usuário — é essa ordem que
// vale tanto pro cabeçalho quanto pras células da tabela.
export function getColunasAtivas(tabela) {
    const { ordem, ativas } = lerEstado(tabela);
    const setAtivas = new Set(ativas);
    return ordem.filter((k) => setAtivas.has(k));
}

export function isColunaAtiva(tabela, key) {
    return getColunasAtivas(tabela).includes(key);
}

// Marca/desmarca todas as colunas de uma vez (mantendo a ordem já salva) —
// uma única escrita e um único disparo de evento, ao contrário de chamar
// toggleColuna em loop.
export function selecionarTodasColunas(tabela) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    estado.ativas = [...estado.ordem];

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

export function desmarcarTodasColunas(tabela) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    estado.ativas = [];

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Alterna uma coluna e dispara 'colunas:alteradas' pra quem estiver
// escutando (render-listas.js) re-renderizar a tabela em questão.
// Não mexe na ordem — só liga/desliga dentro dela.
export function toggleColuna(tabela, key, ativo) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    const setAtivas = new Set(estado.ativas);
    if (ativo) setAtivas.add(key);
    else setAtivas.delete(key);
    estado.ativas = estado.ordem.filter((k) => setAtivas.has(k));

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Troca a posição de uma coluna com a vizinha (acima/abaixo na ordem
// atual) — mesmo padrão de moverLivro() em render-listas.js.
export function moverColuna(tabela, key, direcao) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    const idx = estado.ordem.indexOf(key);
    if (idx === -1) return;

    const alvo = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= estado.ordem.length) return;

    [estado.ordem[idx], estado.ordem[alvo]] = [estado.ordem[alvo], estado.ordem[idx]];

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Monta o HTML do painel de checkboxes + setinhas de reordenar (usado
// dentro do popover "Colunas ▾"). A ordem de exibição das linhas do
// próprio seletor já reflete a ordem escolhida.
export function renderSeletorColunas(tabela) {
    const def = DEFINICAO_COLUNAS[tabela];
    if (!def) return '';

    const rotulos = Object.fromEntries(def.map((c) => [c.key, c.label]));
    const { ordem, ativas } = lerEstado(tabela);
    const setAtivas = new Set(ativas);

    const acoesEmMassa = `
        <div class="flex gap-3 mb-1 pb-1.5 border-b border-gray-200 dark:border-slate-600">
            <button type="button" onclick="selecionarTodasColunas('${tabela}')"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Marcar todas
            </button>
            <button type="button" onclick="desmarcarTodasColunas('${tabela}')"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Desmarcar todas
            </button>
        </div>`;

    return (
        acoesEmMassa +
        ordem
            .map(
                (key, i) => `
        <div class="flex items-center gap-1 text-xs py-1 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap">
            <div class="flex flex-col leading-none mr-1">
                <button type="button" onclick="moverColuna('${tabela}', '${key}', 'up')" ${i === 0 ? 'disabled' : ''}
                    class="text-[9px] text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:hover:text-gray-400"
                    title="Mover para cima">▲</button>
                <button type="button" onclick="moverColuna('${tabela}', '${key}', 'down')" ${i === ordem.length - 1 ? 'disabled' : ''}
                    class="text-[9px] text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:hover:text-gray-400"
                    title="Mover para baixo">▼</button>
            </div>
            <label class="flex items-center gap-2 py-0.5 px-1 cursor-pointer">
                <input type="checkbox" ${setAtivas.has(key) ? 'checked' : ''}
                    onchange="toggleColuna('${tabela}', '${key}', this.checked)">
                ${rotulos[key]}
            </label>
        </div>`,
            )
            .join('')
    );
}
