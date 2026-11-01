// ============================================================
// download-abrangente.js: preferências "Sonoridade" e "Progressão" do
// download de Poemas. Cada uma, quando ligada, inclui junto, no download
// de um Poema em .md, .pdf, .docx ou .json, a Sonoridade (escansão) ou a
// Progressão Morfofuncional cadastradas para aquele poema, se existirem
// (getEscansaoDoPoema/getEstruturaDoPoema, db.js). O .csv não muda.
// (O nome do arquivo vem do antigo "Abrangente", que ligava as duas juntas.)
//
// Só existe pra Poemas: Sonoridade e Morfofuncionalidade são sempre
// ligadas a um `poemaId` (ver db.js), então as caixas nunca aparecem nos
// lugares de Prosa.
//
// Cada preferência é UM booleano no localStorage (não por tabela), e as
// caixas dos três lugares (modal "Ver", painel "⚙️ Ações ▾" e barra de
// seleção em massa) leem e escrevem o mesmo valor, para ficarem
// sincronizadas. Quem tinha o antigo "Abrangente" ligado e ainda não
// escolheu nada nas novas fica com as duas ligadas.
// ============================================================

import { getEscansaoDoPoema, getEstruturaDoPoema, getLeiturasDoTexto } from './db.js';
import { isDownloadLeiturasAtivo } from './leituras-download.js';
import { leiturasParaMarkdown } from './leituras-saida.js';
import { escansaoParaMarkdown } from './exportar-sonoridade.js';
import { estruturaParaMarkdown } from './exportar-estrutura-textual.js';

const LS_ABRANGENTE_ANTIGO = 'arquivoPoetico_downloadAbrangente';

const PREFS = {
    sonoridade: { chave: 'arquivoPoetico_downloadSonoridade', classe: 'download-sonoridade-check' },
    progressao: { chave: 'arquivoPoetico_downloadProgressao', classe: 'download-progressao-check' },
};

function lerLS(chave) {
    try {
        return localStorage.getItem(chave);
    } catch {
        return null;
    }
}

function lerPref(nome) {
    const guardado = lerLS(PREFS[nome].chave);
    if (guardado !== null) return guardado === '1';
    return lerLS(LS_ABRANGENTE_ANTIGO) === '1';
}

export function isDownloadSonoridadeAtivo() {
    return lerPref('sonoridade');
}

export function isDownloadProgressaoAtivo() {
    return lerPref('progressao');
}

function sincronizarCheckboxes() {
    if (typeof document === 'undefined') return;
    Object.keys(PREFS).forEach((nome) => {
        const ativo = lerPref(nome);
        document.querySelectorAll(`.${PREFS[nome].classe}`).forEach((el) => {
            el.checked = ativo;
        });
    });
}

function gravarPref(nome, ativo) {
    try {
        localStorage.setItem(PREFS[nome].chave, ativo ? '1' : '0');
    } catch (e) {
        console.warn('[download-abrangente.js] Não foi possível salvar a preferência:', e);
    }
    sincronizarCheckboxes();
}

// onchange das caixas.
export function toggleDownloadSonoridade(ativo) {
    gravarPref('sonoridade', ativo);
}

export function toggleDownloadProgressao(ativo) {
    gravarPref('progressao', ativo);
}

// Aplica o estado salvo às caixas já presentes no DOM: chamado uma vez no
// carregamento (main.js), já que a barra em massa e o modal "Ver" são HTML
// estático (não recriado a cada render, diferente do painel de Ações).
export function sincronizarCheckboxesComEstadoSalvo() {
    sincronizarCheckboxes();
}

const TITULO_SONORIDADE =
    'Inclui a Sonoridade (escansão) dos poemas, quando cadastrada (.md, .pdf, .docx e .json; o .csv não muda)';
const TITULO_PROGRESSAO =
    'Inclui a Progressão Morfofuncional dos poemas, quando cadastrada (.md, .pdf, .docx e .json; o .csv não muda)';

// As duas caixas (HTML), para os pontos de montagem dinâmicos.
export function renderCaixasSonoridadeProgressao() {
    const caixa = (nome, onchange, titulo, rotulo) => `
            <label class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap"
                title="${titulo}">
                <input type="checkbox" class="${PREFS[nome].classe}" ${lerPref(nome) ? 'checked' : ''}
                    onchange="${onchange}(this.checked)">
                ${rotulo}
            </label>`;
    return (
        caixa('progressao', 'toggleDownloadProgressao', TITULO_PROGRESSAO, '📈 Progressão') +
        caixa('sonoridade', 'toggleDownloadSonoridade', TITULO_SONORIDADE, '🎼 Sonoridade')
    );
}

// Preenche os pontos de montagem (`.sonoridade-progressao-slot`) do HTML
// estático. Idempotente; chamado no carregamento (main.js) e ao abrir o Ver.
export function montarCaixasSonoridadeProgressao(raiz) {
    if (typeof document === 'undefined') return;
    (raiz || document).querySelectorAll('.sonoridade-progressao-slot').forEach((slot) => {
        if (!slot.dataset.montado) {
            slot.innerHTML = renderCaixasSonoridadeProgressao();
            slot.dataset.montado = '1';
        }
    });
    sincronizarCheckboxes();
}

// Controles extras do painel "⚙️ Ações ▾": só entram pra tabela 'poemas' (ver
// celulas-tabela.js/atualizarPainelAcoes). Não é um campo novo em
// DEFINICAO_ACOES/FORMATOS_BAIXAR (acoes-coluna.js) porque esses são
// compartilhados com Prosa/Sonoridade/Morfofuncionalidade.
export function renderCheckboxDownloadAbrangenteAcoes() {
    return renderCaixasSonoridadeProgressao();
}

// ─── Enriquecimento pro JSON ────────────────────────────────────────
// Ausência de Sonoridade e/ou Morfofuncionalidade não é erro — a seção
// correspondente simplesmente não entra (mesmo espírito de "não
// posicionado" já usado em outros lugares do app).
function enriquecerItemComExtras(item) {
    // As leituras avaliativas valem para Poema e Prosa; Sonoridade e
    // Progressão, só para Poema.
    const leituras = isDownloadLeiturasAtivo()
        ? getLeiturasDoTexto(item.id, item.tipo === 'prosa' ? 'prosa' : 'poema')
        : [];
    const comLeituras = leituras.length ? { ...item, leituras } : item;
    if (item.tipo !== 'poema') return comLeituras;

    const sonoridade = isDownloadSonoridadeAtivo() ? getEscansaoDoPoema(item.id) : null;
    const estruturaTextual = isDownloadProgressaoAtivo() ? getEstruturaDoPoema(item.id) : null;
    if (!sonoridade && !estruturaTextual) return comLeituras;

    return {
        ...comLeituras,
        ...(sonoridade ? { sonoridade } : {}),
        ...(estruturaTextual ? { estruturaTextual } : {}),
    };
}

// Chamada por itensDaSelecao() (exportar.js) — único ponto de entrada
// compartilhado pelo botão "Baixar" da linha, o modal de Visualização e
// a barra de seleção em massa, então cobre os três lugares combinados
// sem precisar repetir a checagem em cada um.
export function enriquecerItensComExtras(itens) {
    return itens.map(enriquecerItemComExtras);
}

// ─── Blocos extras pro Markdown ──────────────────────────────────────
// Reaproveita escansaoParaMarkdown/estruturaParaMarkdown (mesmos
// geradores dos downloads avulsos de Sonoridade/Morfofuncionalidade),
// concatenados sob seu próprio "##" — chamado por gerarMarkdownExportacao
// (exportar-md.js) pra cada item já enriquecido (item.sonoridade/
// item.estruturaTextual, anexados por enriquecerItensComExtras acima).
export function blocosExtrasMarkdown(item) {
    const poemaRef = { titulo: item.titulo };
    let md = '';
    if (item.sonoridade) md += escansaoParaMarkdown(item.sonoridade, poemaRef);
    if (item.estruturaTextual) md += estruturaParaMarkdown(item.estruturaTextual, poemaRef);
    md += blocoLeiturasMarkdown(item);
    return md;
}

// Só as leituras avaliativas (Poema e Prosa): vazio quando o item não as traz.
// Usado também pelo PDF, que trata a Sonoridade à parte.
export function blocoLeiturasMarkdown(item) {
    return leiturasParaMarkdown(item.leituras);
}

// Só a Morfofuncionalidade — usado pelo PDF abrangente (exportar-pdf.js),
// que trata a Sonoridade à parte (Grade Silábica desenhada como tabela
// de verdade, não como texto — ver desenharGradeSilabicaPdf em
// exportar-sonoridade.js). .md/.docx continuam pela blocosExtrasMarkdown
// de cima, sem mudança nenhuma.
export function blocoEstruturaMarkdown(item) {
    if (!item.estruturaTextual) return '';
    return estruturaParaMarkdown(item.estruturaTextual, { titulo: item.titulo });
}
