// ============================================================
// fuso-horario.js — Fuso horário que define o "hoje" do app.
// Hoje só serve à duração dos períodos "em andamento" (ver comDuracao em
// utils.js): o período sem fim conta até a data de hoje neste fuso. Um fuso só
// para o app inteiro, salvo no localStorage (preferência, entra no arquivo de
// extras do backup). Padrão: Brasília.
// Importado por: main.js (expõe setFusoHorario no window), render-listas.js e
// os modais Ver (opcoesDuracao).
// ============================================================

import { hojeNoFuso } from './utils.js';

export const FUSO_PADRAO = 'America/Sao_Paulo';
const LS_CHAVE = 'arquivoPoetico_fusoHorario';

// Fusos do Brasil primeiro (rótulo em português); os demais vêm da lista do
// navegador.
const FUSOS_BRASIL = [
    ['America/Sao_Paulo', 'Brasília (São Paulo, Rio, Belo Horizonte...)'],
    ['America/Manaus', 'Manaus'],
    ['America/Cuiaba', 'Cuiabá, Campo Grande'],
    ['America/Rio_Branco', 'Rio Branco'],
    ['America/Noronha', 'Fernando de Noronha'],
];

export function fusoValido(fuso) {
    if (!fuso || typeof fuso !== 'string') return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: fuso });
        return true;
    } catch {
        return false;
    }
}

export function getFusoHorario() {
    let salvo = null;
    try {
        salvo = localStorage.getItem(LS_CHAVE);
    } catch {
        /* localStorage indisponível: segue o padrão */
    }
    return fusoValido(salvo) ? salvo : FUSO_PADRAO;
}

export function setFusoHorario(fuso) {
    const novo = fusoValido(fuso) ? fuso : FUSO_PADRAO;
    try {
        if (novo === FUSO_PADRAO) localStorage.removeItem(LS_CHAVE);
        else localStorage.setItem(LS_CHAVE, novo);
    } catch {
        /* sem localStorage: vale só até recarregar */
    }
    window.dispatchEvent(new CustomEvent('fuso:alterado', { detail: { fuso: novo } }));
}

// Data de hoje no fuso escolhido.
export function hojeDoUsuario(agora = new Date()) {
    return hojeNoFuso(getFusoHorario(), agora);
}

// Opções de comDuracao para um registro (período ou corrente).
export function opcoesDuracao(registro) {
    return {
        emAndamento: !!registro?.emAndamento,
        emAberto: !!registro?.emAndamento && !!registro?.emAberto,
        hoje: hojeDoUsuario(),
    };
}

function listaDeFusos() {
    const brasil = new Set(FUSOS_BRASIL.map(([id]) => id));
    const todos =
        typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return { brasil, outros: todos.filter((id) => !brasil.has(id)) };
}

const escapar = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function renderPainelFuso() {
    const atual = getFusoHorario();
    const { outros } = listaDeFusos();
    const opcao = (id, rotulo) =>
        `<option value="${escapar(id)}"${id === atual ? ' selected' : ''}>${escapar(rotulo)}</option>`;
    // Um fuso salvo que não está em nenhuma das listas (navegador mais antigo)
    // ainda aparece, para o select não mostrar outro valor.
    const extra =
        FUSOS_BRASIL.some(([id]) => id === atual) || outros.includes(atual)
            ? ''
            : opcao(atual, atual);
    return `
        <label class="block text-[10px] text-gray-500 dark:text-slate-400 mb-1" for="select-fuso-horario">
            Fuso horário (define o "hoje" das durações em andamento)
        </label>
        <select id="select-fuso-horario" onchange="setFusoHorario(this.value)" class="w-full text-xs">
            <optgroup label="Brasil">${FUSOS_BRASIL.map(([id, rotulo]) => opcao(id, rotulo)).join('')}</optgroup>
            ${outros.length ? `<optgroup label="Outros fusos">${outros.map((id) => opcao(id, id.replace(/_/g, ' '))).join('')}</optgroup>` : ''}
            ${extra}
        </select>`;
}

export function initFusoHorario() {
    const painel = document.getElementById('painel-fuso');
    if (painel) painel.innerHTML = renderPainelFuso();
}
