// ============================================================
// colunas-contagem.js — Colunas dinâmicas de "quantidade de valores"
// nas tabelas de Poemas, Prosas e Sonoridade (item 3 do plano de
// melhorias de busca e metadados, estendido a Prosas pelo item 1 do
// plano de integração — ver Prosa e Poema.md — e a Sonoridade depois,
// ver decisoes.md): cada instância conta os valores de UM campo
// escolhido — o usuário pode adicionar quantas quiser, cada uma com
// seu próprio seletor de campo, pra comparar mais de um campo de uma
// vez (ex.: Qtd. Pessoas ao lado de Qtd. Intertextualidade) em vez de
// só uma contagem por vez.
//
// O CONJUNTO de campos contáveis não é fixo — é um registro por
// tabela (ver registroContavel abaixo): CAMPOS_CONTAVEIS (utils.js)
// pra Poemas/Prosas, campos multivalorados simples
// (`item[campo].length`); pra Sonoridade, CAMPOS_CONTAVEIS_RIMA +
// camposContaveisEco (editor-sonoridade.js), derivados de `rimas`/
// `ecos`/`escansaoLinhas` do próprio registro. Sonoridade é a única
// tabela com DOIS <select> de campo em vez de um só — Rima (~18
// opções, por isso agrupada em <optgroup> Geral/Posição/Proximidade/
// Acentuação/Tonalidade/Riqueza) e Eco (~7+ opções, lista achatada) —
// ver renderSeletorColunasContagemSonoridade/familiaContavelSonoridade
// mais abaixo pro porquê da separação (um select combinando os dois
// ficava enorme e difícil de vasculhar). Poemas/Prosas continuam com
// um <select> só (CAMPOS_CONTAVEIS não define `grupo`).
//
// Cada instância também carrega um filtro numérico opcional
// (operador + valor, ex. ">= 2") — se preenchido, a lista da tabela só
// mostra itens cuja contagem daquele campo bate a comparação (ver
// itemBateFiltrosContagem abaixo, usado por getListaVisivelPoemas/
// getListaVisivelProsas em render-listas.js). Sem operador ou sem valor,
// a coluna só exibe a contagem, sem filtrar nada — comportamento
// original preservado.
//
// Diferente de colunas.js (DEFINICAO_COLUNAS é uma lista FIXA de
// colunas, uma por campo do modal — o usuário só liga/desliga a que
// já existe), aqui não há lista fixa: o usuário cria quantas
// instâncias quiser, cada uma configurável depois de criada — por
// isso o estado salvo é uma lista de {id, campo, operador, valor},
// não um conjunto de chaves pré-definidas.
//
// Disponível em Poemas, Prosas (ver item 1 do plano de integração em
// Prosa e Poema.md) e Sonoridade — as três tabelas têm cabeçalho
// ordenável (ver thOrdenavel em celulas-tabela.js), então uma coluna de
// contagem em qualquer uma delas pode ser ordenada, não só exibir o
// número.
//
// Importado por: render-listas.js (lê as colunas ativas pra montar
// linhas + ordenação + filtro), celulas-tabela.js (monta o
// cabeçalho), main.js (expõe adicionarColunaContagem/
// removerColunaContagem/definirCampoColunaContagem/
// definirOperadorColunaContagem/definirValorColunaContagem no window
// pro onclick/onchange do HTML).
// ============================================================

import { gerarId, CAMPOS_CONTAVEIS } from './utils.js';
import {
    CAMPOS_CONTAVEIS_RIMA,
    camposContaveisEco,
    construirCamposContaveisSonoridade,
} from './editor-sonoridade.js';
import { db } from './db.js';

const LS_PREFIX = 'arquivoPoetico_colunasContagem_';

// Registro COMBINADO (Rima + Eco) de 'sonoridade' — usado por tudo que
// só precisa validar/calcular uma coluna já escolhida, sem se importar
// com de qual família ela é (lerEstado, definirCampoColunaContagem,
// itemBateFiltrosContagem, aplicarOrdenacao em render-listas.js, label
// em thContagem/celulas-tabela.js). Depende de `db.escansoes` pra
// descobrir tipos de Eco personalizados já usados na coleção (ver
// tiposEcoPresentes em editor-sonoridade.js) — por isso é chamado de
// novo aqui dentro, nunca guardado numa constante módulo-level, senão
// um eco digitado numa sessão não apareceria sem recarregar a página.
// A separação em DOIS <select> (ver renderSeletorColunasContagemSonoridade
// abaixo) é só na camada de UI; pra validação/ordenação as duas famílias
// continuam um registro só.
export function registroContavel(tabela) {
    if (tabela === 'sonoridade') return construirCamposContaveisSonoridade(db.escansoes);
    return CAMPOS_CONTAVEIS;
}

// Sub-registro (Rima x Eco) que contém `campo` — usado só pela camada de
// UI (renderOpcoesCampoContagem/adicionarColunaContagem) pra saber qual
// dos dois <select> de Sonoridade uma coluna pertence, sem precisar
// guardar a família como um dado à parte no estado salvo: o próprio
// `campo` já entrega essa informação (toda chave de Rima nasce de
// CAMPOS_CONTAVEIS_RIMA, toda chave de Eco de camposContaveisEco — ver
// editor-sonoridade.js). Cai em Rima por padrão quando `campo` não bate
// em nenhum dos dois (coluna nova ainda sem campo válido).
function familiaContavelSonoridade(campo) {
    const registroEco = camposContaveisEco(db.escansoes);
    if (registroEco[campo]) return { label: 'Contagem de Ecos', registro: registroEco };
    return { label: 'Contagem de Rimas', registro: CAMPOS_CONTAVEIS_RIMA };
}

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

// Prefixo da key sintética usada em ordenacaoPoemas.campo/ordenacaoProsas.campo
// pra apontar pra uma coluna de contagem em vez de uma coluna fixa (ver
// COMPARADORES_ORDENACAO / aplicarOrdenacao em render-listas.js) —
// precisa do id porque pode haver mais de uma coluna de contagem ativa
// ao mesmo tempo.
export const PREFIXO_ORDENACAO = 'contagem:';

function lerEstado(tabela) {
    const registro = registroContavel(tabela);
    const raw = localStorage.getItem(LS_PREFIX + tabela);
    if (raw) {
        try {
            const salvo = JSON.parse(raw);
            if (Array.isArray(salvo)) {
                return salvo
                    .filter((c) => c && typeof c.id !== 'undefined' && registro[c.campo])
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

// `familia` só importa pra 'sonoridade' ('rima' ou 'eco') — decide de
// qual dos dois registros a coluna nova puxa seu campo padrão (ver
// renderSeletorColunasContagemSonoridade, que passa a família de qual
// bloco/botão foi clicado). Ignorado em qualquer outra tabela.
export function adicionarColunaContagem(tabela, familia) {
    const lista = lerEstado(tabela);
    const registroInicial =
        tabela === 'sonoridade'
            ? familia === 'eco'
                ? camposContaveisEco(db.escansoes)
                : CAMPOS_CONTAVEIS_RIMA
            : registroContavel(tabela);
    const campoPadrao = Object.keys(registroInicial)[0];
    lista.push({ id: gerarId(), campo: campoPadrao, operador: '', valor: '' });
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

export function removerColunaContagem(tabela, id) {
    const lista = lerEstado(tabela).filter((c) => c.id !== id);
    salvarEstado(tabela, lista);
    disparaAlteracao(tabela);
}

export function definirCampoColunaContagem(tabela, id, campo) {
    if (!registroContavel(tabela)[campo]) return;
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
    const registro = registroContavel(tabela);
    return lerEstado(tabela).every((c) => {
        const contar = registro[c.campo]?.contar;
        if (!contar) return true;
        return bateFiltroContagem(contar(item, db), c.operador, c.valor);
    });
}

// <option>s do seletor de campo — agrupadas em <optgroup> quando o
// registro define `grupo` em pelo menos uma entrada (caso de
// CAMPOS_CONTAVEIS_RIMA, ~18 opções); lista achatada quando não (caso
// de CAMPOS_CONTAVEIS e de camposContaveisEco, sem necessidade de
// agrupar). Em 'sonoridade' isto monta o <select> de UMA família só —
// a que contém `selecionado` (ver familiaContavelSonoridade) — nunca a
// combinação das duas, senão o select voltaria a ficar enorme; em
// qualquer outra tabela usa o registro inteiro normalmente. Exportada
// pra thContagem (celulas-tabela.js) reaproveitar em vez de duplicar
// essa lógica de agrupamento no cabeçalho da tabela.
export function renderOpcoesCampoContagem(tabela, selecionado) {
    const registro =
        tabela === 'sonoridade'
            ? familiaContavelSonoridade(selecionado).registro
            : registroContavel(tabela);
    const entradas = Object.entries(registro);
    const opcao = ([key, { label }]) =>
        `<option value="${key}" ${key === selecionado ? 'selected' : ''}>${label}</option>`;
    if (!entradas.some(([, campo]) => campo.grupo)) {
        return entradas.map(opcao).join('');
    }
    const porGrupo = new Map();
    entradas.forEach((entrada) => {
        const grupo = entrada[1].grupo || 'Geral';
        if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
        porGrupo.get(grupo).push(entrada);
    });
    return [...porGrupo.entries()]
        .map(
            ([grupo, itens]) =>
                `<optgroup label="${grupo}">${itens.map(opcao).join('')}</optgroup>`,
        )
        .join('');
}

function opcoesOperador(selecionado) {
    return OPERADORES_CONTAGEM.map(
        ({ value, label }) =>
            `<option value="${value}" ${value === selecionado ? 'selected' : ''}>${label}</option>`,
    ).join('');
}

// Uma linha (<select> de campo + <select> de operador + <input> de
// valor + botão de remover) de UMA coluna de contagem já ativa —
// compartilhada entre renderSeletorColunasContagem (Poemas/Prosas, um
// bloco só) e renderSeletorColunasContagemSonoridade (dois blocos,
// abaixo) pra não duplicar essa marcação nos dois lugares.
function renderLinhaColunaContagem(tabela, c) {
    return `
        <div class="flex items-center gap-1 text-xs py-1 flex-wrap">
            <span class="text-gray-400 dark:text-slate-500 whitespace-nowrap">Qtd.</span>
            <select onchange="definirCampoColunaContagem('${tabela}', ${c.id}, this.value)"
                class="text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5">
                ${renderOpcoesCampoContagem(tabela, c.campo)}
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
        </div>`;
}

// Um bloco "Colunas de contagem" completo — título + "?" de ajuda +
// linhas ativas + botão "+ Adicionar". Sozinho pra Poemas/Prosas (só
// uma família de campo); duas vezes lado a lado (Rima/Eco) pra
// Sonoridade — ver as duas funções de render abaixo.
function renderBlocoColunasContagem(titulo, idAjuda, textoBotao, onclickAdicionar, linhasHtml) {
    return `
        <div class="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-slate-600">
            <div class="flex items-center gap-1 mb-1">
                <p class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
                    ${titulo}
                </p>
                <button type="button" onclick="togglePainel('${idAjuda}', this)"
                    class="shrink-0 w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] leading-none font-bold hover:bg-slate-300 dark:hover:bg-slate-600"
                    aria-label="O que são colunas de contagem"
                >
                    ?
                </button>
            </div>
            <p id="${idAjuda}"
                class="hidden mb-1 text-[10px] text-gray-400 dark:text-slate-500">
                Quantos valores tem cada campo — operador+nº filtra a lista.
            </p>
            ${linhasHtml}
            <button type="button" onclick="${onclickAdicionar}"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1">
                ${textoBotao}
            </button>
        </div>`;
}

// Monta o HTML da seção "Colunas de contagem" dentro do popover
// "🧱 Colunas ▾" já existente (abaixo do seletor de colunas fixas).
// 'sonoridade' tem sua própria versão (dois blocos, um por família —
// ver renderSeletorColunasContagemSonoridade), porque um <select> só
// combinando Rima (~18 opções) e Eco (~7+) ficava enorme e difícil de
// vasculhar (pedido do Victor); Poemas/Prosas continuam com um bloco só.
export function renderSeletorColunasContagem(tabela) {
    if (tabela === 'sonoridade') return renderSeletorColunasContagemSonoridade();
    const linhas = lerEstado(tabela)
        .map((c) => renderLinhaColunaContagem(tabela, c))
        .join('');
    return renderBlocoColunasContagem(
        'Colunas de contagem',
        `ajuda-colunas-contagem-${tabela}`,
        '+ Adicionar coluna de contagem',
        `adicionarColunaContagem('${tabela}')`,
        linhas,
    );
}

// Versão de Sonoridade: dois blocos independentes, um pra Rima e um
// pra Eco — cada um só lista as colunas ativas daquela família (ver
// familiaContavelSonoridade) e só cria colunas novas daquela família
// (adicionarColunaContagem('sonoridade', 'rima'|'eco')). A família de
// uma coluna nunca é salva à parte no estado — é sempre derivada de
// qual registro contém o `campo` já escolhido, então não há como uma
// coluna "trocar de bloco" sozinha nem duplicar dado entre os dois.
function renderSeletorColunasContagemSonoridade() {
    const lista = lerEstado('sonoridade');
    const registroEco = camposContaveisEco(db.escansoes);
    const deRima = lista.filter((c) => !registroEco[c.campo]);
    const deEco = lista.filter((c) => registroEco[c.campo]);
    return (
        renderBlocoColunasContagem(
            'Colunas de contagem — Rimas',
            'ajuda-colunas-contagem-sonoridade-rima',
            '+ Adicionar coluna de Rima',
            "adicionarColunaContagem('sonoridade', 'rima')",
            deRima.map((c) => renderLinhaColunaContagem('sonoridade', c)).join(''),
        ) +
        renderBlocoColunasContagem(
            'Colunas de contagem — Ecos',
            'ajuda-colunas-contagem-sonoridade-eco',
            '+ Adicionar coluna de Eco',
            "adicionarColunaContagem('sonoridade', 'eco')",
            deEco.map((c) => renderLinhaColunaContagem('sonoridade', c)).join(''),
        )
    );
}
