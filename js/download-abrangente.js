// ============================================================
// download-abrangente.js — Preferência única "Download abrangente":
// quando ligada, o download de um Poema em .md/.json (por ora — .pdf/
// .docx ficam pra depois, ver conversa de decisão) inclui junto a
// Sonoridade e a Progressão Morfofuncional cadastradas pra aquele
// poema, se existirem (getEscansaoDoPoema/getEstruturaDoPoema, db.js).
//
// Só existe pra Poemas: Sonoridade e Morfofuncionalidade são sempre
// ligadas a um `poemaId` (ver db.js) — Prosa não tem nenhuma das duas,
// então o checkbox nunca aparece nos três lugares de Prosa.
//
// Guardado como UM booleano só no localStorage (diferente do formato
// de acoes-coluna.js, que é por-tabela) — só existe num contexto
// (Poemas), e os três checkboxes (modal "Ver", painel "⚙️ Ações ▾" e
// barra de seleção em massa) precisam ler/escrever o mesmo valor, pra
// não ficarem dessincronizados entre si (marcar num lugar reflete nos
// outros dois na hora).
// ============================================================

import { getEscansaoDoPoema, getEstruturaDoPoema } from './db.js';
import { escansaoParaMarkdown } from './exportar-sonoridade.js';
import { estruturaParaMarkdown } from './exportar-estrutura-textual.js';

const LS_KEY = 'arquivoPoetico_downloadAbrangente';

export function isDownloadAbrangenteAtivo() {
    return localStorage.getItem(LS_KEY) === '1';
}

// Classe comum aos três checkboxes (modal, painel de Ações, barra de
// seleção em massa) — usada aqui só pra sincronizar entre eles, nunca
// pra estilização.
function sincronizarCheckboxes(ativo) {
    document.querySelectorAll('.download-abrangente-check').forEach((el) => {
        el.checked = ativo;
    });
}

// Chamado pelo onchange dos três checkboxes.
export function toggleDownloadAbrangente(ativo) {
    localStorage.setItem(LS_KEY, ativo ? '1' : '0');
    sincronizarCheckboxes(ativo);
}

// Aplica o estado salvo aos checkboxes já presentes no DOM — chamado
// uma vez no carregamento da página (main.js), já que a barra de
// seleção em massa e o modal de Visualização são HTML estático (não
// recriado via innerHTML a cada render, diferente do painel de Ações).
export function sincronizarCheckboxesComEstadoSalvo() {
    sincronizarCheckboxes(isDownloadAbrangenteAtivo());
}

// Bloco extra do painel "⚙️ Ações ▾" — só entra pra tabela 'poemas'
// (ver celulas-tabela.js/atualizarPainelAcoes). Não é um campo novo em
// DEFINICAO_ACOES/FORMATOS_BAIXAR (acoes-coluna.js) porque esses são
// compartilhados com Prosa/Sonoridade/Morfofuncionalidade — isso aqui
// é renderizado condicionalmente por fora daquele painel compartilhado.
export function renderCheckboxDownloadAbrangenteAcoes() {
    const ativo = isDownloadAbrangenteAtivo();
    return `
        <div class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap font-semibold text-gray-600 dark:text-slate-300">
                <input type="checkbox" class="download-abrangente-check" ${ativo ? 'checked' : ''}
                    onchange="toggleDownloadAbrangente(this.checked)">
                📦 Download abrangente (inclui Sonoridade e Morfofuncionalidade)
            </label>
        </div>`;
}

// ─── Enriquecimento pro JSON ────────────────────────────────────────
// Ausência de Sonoridade e/ou Morfofuncionalidade não é erro — a seção
// correspondente simplesmente não entra (mesmo espírito de "não
// posicionado" já usado em outros lugares do app).
function enriquecerItemComExtras(item) {
    if (item.tipo !== 'poema' || !isDownloadAbrangenteAtivo()) return item;

    const sonoridade = getEscansaoDoPoema(item.id);
    const estruturaTextual = getEstruturaDoPoema(item.id);
    if (!sonoridade && !estruturaTextual) return item;

    return {
        ...item,
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
    if (!item.sonoridade && !item.estruturaTextual) return '';
    const poemaRef = { titulo: item.titulo };
    let md = '';
    if (item.sonoridade) md += escansaoParaMarkdown(item.sonoridade, poemaRef);
    if (item.estruturaTextual) md += estruturaParaMarkdown(item.estruturaTextual, poemaRef);
    return md;
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
