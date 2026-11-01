// ============================================================
// infos-papel.js: caixa "Infos de papel" das exportações.
//
// Ligada (padrão), os downloads de textos com papéis de Pessoa levam a legenda
// dos papéis usados (ver legenda-papeis-pessoa.js): a chave
// `legenda_papeis_pessoa` no .json e a seção "Legenda dos papéis de Pessoa" no
// .md. Desligada, o arquivo sai sem a legenda; os papéis de cada pessoa nos
// textos continuam lá, só sem a explicação. .csv, .pdf e .docx nunca levam a
// legenda.
//
// Duas escolhas independentes, cada uma guardada neste navegador (um valor só,
// '0' ou '1'; sem valor guardado vale ligada):
//   lote        downloads de vários textos: barra de seleção em massa e aba
//               Exportação (e as Exportações Frequentes);
//   individual  o Baixar de um texto só: painel Ações da coluna e modal de
//               Visualização.
// As caixas de um mesmo escopo são sincronizadas entre si; as de escopos
// diferentes não. Quem exporta diz o escopo em `opcoes.escopo` (padrão:
// 'lote'); `opcoes.infosPapel` explícito (true ou false) manda sobre tudo.
// ============================================================

const ESCOPOS = {
    lote: 'arquivoPoetico_infosPapel',
    individual: 'arquivoPoetico_infosPapelIndividual',
};

function chaveDoEscopo(escopo) {
    return ESCOPOS[escopo] || ESCOPOS.lote;
}

function lerLS(escopo) {
    try {
        return localStorage.getItem(chaveDoEscopo(escopo));
    } catch {
        return null;
    }
}

export function infosPapelAtivo(escopo = 'lote') {
    return lerLS(escopo) !== '0';
}

export function resolverInfosPapel(opcoes = {}) {
    return typeof opcoes.infosPapel === 'boolean'
        ? opcoes.infosPapel
        : infosPapelAtivo(opcoes.escopo);
}

function sincronizarControlesInfosPapel(escopo) {
    if (typeof document === 'undefined') return;
    const ativo = infosPapelAtivo(escopo);
    document.querySelectorAll('.infos-papel-check').forEach((el) => {
        if ((el.dataset?.escopo || 'lote') === escopo) el.checked = ativo;
    });
}

// onchange da caixa.
export function toggleInfosPapel(ativo, escopo = 'lote') {
    try {
        localStorage.setItem(chaveDoEscopo(escopo), ativo ? '1' : '0');
    } catch (e) {
        console.warn('[infos-papel.js] Não foi possível salvar a preferência:', e);
    }
    sincronizarControlesInfosPapel(escopo);
}

const TITULO_BASE =
    'Nos downloads .json e .md, junta a legenda dos papéis de Pessoa usados nos textos (apelido, descrição e regras de convivência). Desmarcada, o arquivo sai sem a legenda, e os papéis de cada pessoa continuam nos textos. O .csv, o .pdf e o .docx não levam a legenda.';
const TITULOS = {
    lote: `${TITULO_BASE} Esta caixa vale para baixar vários textos de uma vez; o Baixar de um texto só tem a sua própria caixa.`,
    individual: `${TITULO_BASE} Esta caixa vale para o Baixar de um texto só (painel Ações e Visualização); baixar vários textos tem a sua própria caixa.`,
};

export function renderControleInfosPapel(escopo = 'lote') {
    const e = ESCOPOS[escopo] ? escopo : 'lote';
    return `
        <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap" title="${TITULOS[e]}">
            <input type="checkbox" class="infos-papel-check" data-escopo="${e}" ${infosPapelAtivo(e) ? 'checked' : ''}
                onchange="toggleInfosPapel(this.checked, '${e}')">
            🏷️ Infos de papel
        </label>`;
}

// Controle do painel "⚙️ Ações ▾" (Poemas e Prosas), onde se configura o Baixar
// da linha: escopo individual.
export function renderInfosPapelAcoes() {
    return renderControleInfosPapel('individual');
}

// Preenche os pontos de montagem (`.infos-papel-slot`) do HTML estático. O
// escopo vem de `data-escopo` do ponto (sem ele, 'lote'). Chamado no
// carregamento (main.js) e de novo quando o modal de Visualização é aberto,
// porque o modal é carregado sob demanda.
export function montarControlesInfosPapel(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.infos-papel-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderControleInfosPapel(slot.dataset.escopo || 'lote');
            slot.dataset.montado = '1';
        }
    });
    sincronizarControlesInfosPapel('lote');
    sincronizarControlesInfosPapel('individual');
}
