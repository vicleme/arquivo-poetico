// ============================================================
// colunas-contagem.js — Colunas dinâmicas de "quantidade de valores"
// na tabela de Poemas (item 3 do plano de melhorias de busca e
// metadados): cada instância conta os valores de UM campo escolhido
// (ver CAMPOS_CONTAVEIS em utils.js) — o usuário pode adicionar
// quantas quiser, cada uma com seu próprio seletor de campo, pra
// comparar mais de um campo de uma vez (ex.: Qtd. Pessoas ao lado de
// Qtd. Intertextualidade) em vez de só uma contagem por vez.
//
// Cada instância também carrega um filtro numérico opcional
// (operador + valor, ex. ">= 2") — se preenchido, a lista de Poemas só
// mostra itens cuja contagem daquele campo bate a comparação (ver
// itemBateFiltrosContagem abaixo, usado por getListaVisivelPoemas em
// render-listas.js). Sem operador ou sem valor, a coluna só exibe a
// contagem, sem filtrar nada — comportamento original preservado.
//
// Diferente de colunas.js (DEFINICAO_COLUNAS é uma lista FIXA de
// colunas, uma por campo do modal — o usuário só liga/desliga a que
// já existe), aqui não há lista fixa: o usuário cria quantas
// instâncias quiser, cada uma configurável depois de criada — por
// isso o estado salvo é uma lista de {id, campo, operador, valor},
// não um conjunto de chaves pré-definidas.
//
// Só Poemas por enquanto — é a única tabela com cabeçalho ordenável
// (ver thOrdenavel em celulas-tabela.js); Prosas ainda não tem
// ordenação nenhuma por coluna, então uma coluna de contagem lá não
// teria como ser ordenada, só mostrar o número — decidimos deixar de
// fora até Prosas ganhar ordenação de verdade.
//
// Importado por: render-listas.js (lê as colunas ativas pra montar
// linhas + ordenação + filtro), celulas-tabela.js (monta o
// cabeçalho), main.js (expõe adicionarColunaContagem/
// removerColunaContagem/definirCampoColunaContagem/
// definirOperadorColunaContagem/definirValorColunaContagem no window
// pro onclick/onchange do HTML).
// ============================================================

import { gerarId, CAMPOS_CONTAVEIS } from './utils.js';

const LS_PREFIX = 'arquivoPoetico_colunasContagem_';
const CAMPO_PADRAO = Object.keys(CAMPOS_CONTAVEIS)[0];

// Operadores de comparação do filtro numérico por coluna de contagem
// — '' (primeira opção) significa "sem filtro, só exibir a contagem".
export const OPERADORES_CONTAGEM = [
    { value: '', label: '—' },
    { value: '<', label: '< menor que' },
    { value: '<=', label: '≤ menor ou igual' },
    { value: '=', label: '= igual' },
    { value: '>=', label: '≥ maior ou igual' },
    { value: '>', label: '> maior que' },
];

// Prefixo da key sintética usada em ordenacaoPoemas.campo pra apontar
// pra uma coluna de contagem em vez de uma coluna fixa (ver
// COMPARADORES_ORDENACAO_POEMAS / getListaVisivelPoemas em
// render-listas.js) — precisa do id porque pode haver mais de uma
// coluna de contagem ativa ao mesmo tempo.
export const PREFIXO_ORDENACAO = 'contagem:';

function lerEstado(tabela) {
    const raw = localStorage.getItem(LS_PREFIX + tabela);
    if (raw) {
        try {
            const salvo = JSON.parse(raw);
            if (Array.isArray(salvo)) {
                return salvo
                    .filter((c) => c && typeof c.id !== 'undefined' && CAMPOS_CONTAVEIS[c.campo])
                    .map((c) => ({ operador: '', valor: '', ...c }));
            }
        } catch {
            // JSON inválido — cai pro padrão abaixo
        }
    }
    return [];
}

function salvarEstado(tabela, lista) {
    localStorage.setItem(LS_PREFIX + tabela, JSON.stringify(lista));
}

function disparaAlteracao(tabela) {
    window.dispatchEvent(new CustomEvent('colunas-contagem:alteradas', { detail: { tabela } }));
}

// Lista de {id, campo, operador, valor} ativa, na ordem em que foram
// criadas. operador/valor vêm sempre preenchidos (com '' se não
// configurados) mesmo pra estado salvo antes dessa migração, ver
// lerEstado acima.
export function getColunasContagem(tabela) {
    return lerEstado(tabela);
}

export function adicionarColunaContagem(tabela) {
    const lista = lerEstado(tabela);
    lista.push({ id: gerarId(), campo: CAMPO_PADRAO, operador: '', valor: '' });
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

export function removerColunaContagem(tabela, id) {
    const lista = lerEstado(tabela).filter((c) => c.id !== id);
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

export function definirCampoColunaContagem(tabela, id, campo) {
    if (!CAMPOS_CONTAVEIS[campo]) return;
    const lista = lerEstado(tabela);
    const coluna = lista.find((c) => c.id === id);
    if (!coluna) return;
    coluna.campo = campo;
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

export function definirOperadorColunaContagem(tabela, id, operador) {
    if (!OPERADORES_CONTAGEM.some((o) => o.value === operador)) return;
    const lista = lerEstado(tabela);
    const coluna = lista.find((c) => c.id === id);
    if (!coluna) return;
    coluna.operador = operador;
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

export function definirValorColunaContagem(tabela, id, valor) {
    const lista = lerEstado(tabela);
    const coluna = lista.find((c) => c.id === id);
    if (!coluna) return;
    // Guarda como veio do input (string) — normalizado só na hora de
    // comparar (ver bateFiltroContagem abaixo), pra não perder o que a
    // pessoa está digitando (ex. "-" no meio de um número negativo).
    coluna.valor = valor;
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

// Compara um valor de contagem contra {operador, valor} de uma coluna.
// Retorna true (não filtra) quando operador ou valor estão vazios, ou
// quando valor não é um número válido — só filtra de fato quando os
// dois estão preenchidos com algo comparável.
export function bateFiltroContagem(valorAtual, operador, valor) {
    if (!operador || valor === '' || valor === null || typeof valor === 'undefined') return true;
    const alvo = Number(valor);
    if (Number.isNaN(alvo)) return true;
    switch (operador) {
        case '<':
            return valorAtual < alvo;
        case '<=':
            return valorAtual <= alvo;
        case '=':
            return valorAtual === alvo;
        case '>=':
            return valorAtual >= alvo;
        case '>':
            return valorAtual > alvo;
        default:
            return true;
    }
}

// Checa um item contra TODAS as colunas de contagem ativas daquela
// tabela que tenham filtro configurado (E entre elas, igual ao resto
// dos filtros da tela) — usado por getListaVisivelPoemas em
// render-listas.js. Colunas sem operador/valor não entram na conta
// (só exibem, não filtram).
export function itemBateFiltrosContagem(item, tabela, db) {
    return lerEstado(tabela).every((c) => {
        const contar = CAMPOS_CONTAVEIS[c.campo]?.contar;
        if (!contar) return true;
        return bateFiltroContagem(contar(item, db), c.operador, c.valor);
    });
}

function opcoesCampo(selecionado) {
    return Object.entries(CAMPOS_CONTAVEIS)
        .map(
            ([key, { label }]) =>
                `<option value="${key}" ${key === selecionado ? 'selected' : ''}>${label}</option>`,
        )
        .join('');
}

function opcoesOperador(selecionado) {
    return OPERADORES_CONTAGEM.map(
        ({ value, label }) =>
            `<option value="${value}" ${value === selecionado ? 'selected' : ''}>${label}</option>`,
    ).join('');
}

// Monta o HTML da seção "Colunas de contagem" dentro do popover
// "🧱 Colunas ▾" já existente (abaixo do seletor de colunas fixas) —
// um <select> de campo + um <select> de operador + um <input> de
// valor + botão de remover por instância ativa, mais um botão
// "+ Adicionar" no fim pra criar uma nova.
export function renderSeletorColunasContagem(tabela) {
    const lista = lerEstado(tabela);

    const linhas = lista
        .map(
            (c) => `
        <div class="flex items-center gap-1 text-xs py-1 flex-wrap">
            <span class="text-gray-400 dark:text-slate-500 whitespace-nowrap">Qtd.</span>
            <select onchange="definirCampoColunaContagem('${tabela}', ${c.id}, this.value)"
                class="text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5">
                ${opcoesCampo(c.campo)}
            </select>
            <select onchange="definirOperadorColunaContagem('${tabela}', ${c.id}, this.value)"
                title="Filtrar a lista pela contagem dessa coluna (deixe em '—' pra só exibir, sem filtrar)"
                class="text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5">
                ${opcoesOperador(c.operador)}
            </select>
            <input type="number" inputmode="numeric" value="${c.valor ?? ''}"
                oninput="definirValorColunaContagem('${tabela}', ${c.id}, this.value)"
                placeholder="nº" title="Valor pra comparar com a contagem"
                class="w-14 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5 px-1" />
            <button type="button" onclick="removerColunaContagem('${tabela}', ${c.id})"
                title="Remover essa coluna de contagem"
                class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 px-1">✕</button>
        </div>`,
        )
        .join('');

    return `
        <div class="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
            <p class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-1">
                Colunas de contagem (quantos valores tem cada campo — operador+nº filtra a lista)
            </p>
            ${linhas}
            <button type="button" onclick="adicionarColunaContagem('${tabela}')"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1">
                + Adicionar coluna de contagem
            </button>
        </div>`;
}
