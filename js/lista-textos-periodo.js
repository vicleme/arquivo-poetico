// ============================================================
// lista-textos-periodo.js — lista de textos (poemas ou prosas) dentro
// do Ver de um Período, com limite e "Ver todos".
//
// Compartilhado pelo Ver do Período Biográfico e do Período Histórico
// (visualizar-periodo-biografico.js, visualizar-periodo-historico.js),
// para os dois ficarem iguais. Só lógica pura e HTML: quem chama decide
// o que fazer no clique.
//
// Os handlers são `onclick` inline (não `data-action`): estes modais ficam
// em #modais-container, fora de <main>, e a delegação de `data-action` só
// escuta dentro de <main>.
// ============================================================

import { escapeHtml } from './utils.js';

export const LIMITE_TEXTOS_NO_VER = 6;

// Data parcial ({ ano, mes?, dia? }) em número comparável. Mês ou dia
// ausente conta como o fim do período conhecido (mesma leitura das colunas
// de data da lista). Sem ano, devolve null: vai para o fim.
function chaveData(data) {
    if (!data || data.ano == null) return null;
    return data.ano * 10000 + (data.mes ?? 13) * 100 + (data.dia ?? 32);
}

// Ordem dos textos no Ver: por data de escrita; sem data, por título.
// Não altera a lista recebida.
export function ordenarTextosDoPeriodo(textos) {
    return [...textos].sort((a, b) => {
        const ka = chaveData(a.dataEscrita);
        const kb = chaveData(b.dataEscrita);
        if (ka !== kb) {
            if (ka === null) return 1;
            if (kb === null) return -1;
            return ka - kb;
        }
        return (a.titulo || '(sem título)').localeCompare(b.titulo || '(sem título)', 'pt-BR');
    });
}

// Título da seção: sempre com o total, mesmo mostrando só o limite.
export function tituloSecaoTextos(rotuloPlural, total, sufixo = '') {
    return `${rotuloPlural} (${total}${sufixo})`;
}

// `textos`: [{ id, titulo, dataEscrita }]. `tipo`: 'poema' | 'prosa'.
// `funcaoAbrir`: nome da função global chamada com (tipo, id) no clique do
// título (cada Ver tem a sua, porque cada uma fecha o próprio modal).
// `acaoVerTodos`: expressão JS do onclick do botão "Ver todos" (já com o id
// do período, montada por quem chama). Devolve '' sem textos.
export function listaTextosPeriodoHtml(
    textos,
    { tipo, funcaoAbrir, acaoVerTodos, limite = LIMITE_TEXTOS_NO_VER } = {},
) {
    if (!textos.length || !funcaoAbrir) return '';
    const tipoSeguro = tipo === 'prosa' ? 'prosa' : 'poema';
    const ordenados = ordenarTextosDoPeriodo(textos);
    const itens = ordenados
        .slice(0, limite)
        .map((t) => {
            const nome = t.titulo || '(sem título)';
            return `<li><button type="button" onclick="${funcaoAbrir}('${tipoSeguro}', ${Number(t.id)})" class="text-left text-blue-600 dark:text-blue-400 hover:underline">${escapeHtml(nome)}</button></li>`;
        })
        .join('');
    let html = `<ul class="text-sm text-gray-700 dark:text-slate-200 space-y-1">${itens}</ul>`;
    if (textos.length > limite && acaoVerTodos) {
        const rotulo = tipoSeguro === 'prosa' ? 'prosas' : 'poemas';
        html += `<button type="button" onclick="${acaoVerTodos}" class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todos os ${textos.length} ${rotulo}</button>`;
    }
    return html;
}
