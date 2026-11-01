// ============================================================
// onde-aparece-ui.js: o grupo "Onde aparece" dos modais de Poema ('p') e Prosa
// ('pr') (Fase 21, etapa 21-2, entrega 2). Uma linha por aparição: livro, lugar
// (Parte ou Seção do livro) e posição, com "+ Aparição" e o botão de tirar. A
// lógica pura mora em `onde-aparece-linhas.js`; quem grava é
// `salvarAparicoesDoTexto` (`aparicoes-salvar.js`), chamada pelo salvar do
// modal (`forms.js`).
//
// O DOM é a verdade enquanto o modal está aberto: `lerOndeAparece` lê as linhas
// na hora de salvar. Com o status Descartado o grupo fica travado (os valores
// continuam nos campos e são lidos como estão), porque o texto saiu da árvore
// e a origem vive em "Cortado de".
// ============================================================

import { db } from './db.js';
import { posicaoNoFimDoLugar } from './aparicoes-salvar.js';
import {
    MODOS_DE_POSICAO,
    destinoDasLinhas,
    linhasDoTexto,
    linhasRepetidas,
    livrosParaAparicao,
    opcoesDeLugar,
    partesDoLugar,
} from './onde-aparece-linhas.js';
import { escapeHtml } from './utils.js';

const ids = (pref) => ({
    linhas: `${pref}-onde-linhas`,
    adicionar: `${pref}-onde-add`,
    vazio: `${pref}-onde-vazio`,
    trava: `${pref}-onde-trava`,
    grupo: `${pref}-onde-grupo`,
});

const COLECAO = { p: 'poemas', pr: 'prosas' };

function textoEmEdicao(pref) {
    const editId = document.getElementById(`${pref}-edit-id`)?.value;
    if (!editId) return null;
    return (db[COLECAO[pref]] || []).find((t) => String(t.id) === String(editId)) || null;
}

const estaDescartado = (pref) => document.getElementById(`${pref}-status`)?.value === 'descartado';

const el = (linha, classe) => linha.querySelector(`.${classe}`);

function optionsDeLivros() {
    return (
        `<option value="">-- Escolha o livro --</option>` +
        livrosParaAparicao(db)
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('')
    );
}

function rotuloDaOpcao(o) {
    if (o.valor.startsWith('parte:')) return `▸ ${o.rotulo}`;
    if (o.valor.startsWith('secao:')) return `${o.nivel === 2 ? '　' : ''}↳ ${o.rotulo}`;
    return o.rotulo;
}

function optionsDeLugar(livroId) {
    return opcoesDeLugar(db, livroId)
        .map((o) => `<option value="${o.valor}">${escapeHtml(rotuloDaOpcao(o))}</option>`)
        .join('');
}

const CLASSE_CAMPO =
    'p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs';
const CLASSE_SELECT = `w-full ${CLASSE_CAMPO}`;

function htmlDaLinha(linha) {
    const modos = MODOS_DE_POSICAO.map(
        (m) => `<option value="${m.valor}">${m.rotulo}</option>`,
    ).join('');
    return `
        <div class="flex gap-1 items-start">
            <select class="ol-livro ${CLASSE_SELECT} flex-1" aria-label="Livro">${optionsDeLivros()}</select>
            <button type="button" class="ol-remover flex-shrink-0 px-2 py-1 text-xs font-bold text-red-500 hover:text-red-700" title="Tirar esta aparição" aria-label="Tirar esta aparição">✕</button>
        </div>
        <select class="ol-lugar ${CLASSE_SELECT}" aria-label="Parte ou Seção">${optionsDeLugar(linha.livroId)}</select>
        <div class="ol-posicao flex gap-1 items-center hidden">
            <select class="ol-modo ${CLASSE_SELECT} flex-1" aria-label="Posição">${modos}</select>
            <input type="number" min="1" class="ol-seq ${CLASSE_CAMPO} w-20 flex-shrink-0 hidden" placeholder="Ex: 1" aria-label="Número da posição" />
        </div>
        <p class="ol-dica text-[10px] text-gray-400 dark:text-slate-500"></p>
        <p class="ol-repetida hidden text-[10px] text-amber-600 dark:text-amber-400">Já existe uma linha para este lugar: só a primeira vale.</p>`;
}

// ─── Leitura do que está na tela ──────────────────────────────

function linhasDoDom(pref) {
    return Array.from(document.getElementById(ids(pref).linhas)?.children || []);
}

// As linhas como `{ livroId, lugar, modo, sequencia }` (ver onde-aparece-linhas.js).
export function lerOndeAparece(pref) {
    return linhasDoDom(pref).map((linha) => {
        const livroId = el(linha, 'ol-livro').value;
        const lugar = el(linha, 'ol-lugar').value;
        return {
            livroId: livroId === '' ? null : parseInt(livroId),
            lugar,
            modo: lugar ? el(linha, 'ol-modo').value : null,
            sequencia: el(linha, 'ol-seq').value,
        };
    });
}

// O "Destino" que as telas antigas enxergam (a primeira linha com lugar), com a
// posição já resolvida. Serve ao "Cortado de" do Descartado.
export function destinoDoModal(pref) {
    const emEdicao = textoEmEdicao(pref);
    return destinoDasLinhas(lerOndeAparece(pref), (livroId, lugar) => {
        const [tipo, id] = partesDoLugar(lugar);
        return posicaoNoFimDoLugar(db, emEdicao, aparicaoDaLinha(livroId, tipo, id));
    });
}

function aparicaoDaLinha(livroId, tipo, id) {
    return {
        livroId,
        parteId: tipo === 'parte' ? id : null,
        secaoId: tipo === 'secao' ? id : null,
    };
}

// ─── Atualização de cada linha ────────────────────────────────

function atualizarDica(pref, linha) {
    const dica = el(linha, 'ol-dica');
    const livro = el(linha, 'ol-livro').value;
    const lugar = el(linha, 'ol-lugar').value;
    if (!livro) {
        dica.textContent = '';
        return;
    }
    if (!lugar) {
        dica.textContent = 'O texto consta no livro, sem lugar e sem posição.';
        return;
    }
    const modo = el(linha, 'ol-modo').value;
    if (modo === 'nenhuma') {
        dica.textContent = 'Fica neste lugar, mas fora da numeração.';
    } else if (modo === 'especifica') {
        dica.textContent = 'Quem estiver nessa posição ou depois dela desce uma casa.';
    } else {
        const [tipo, id] = partesDoLugar(lugar);
        const n = posicaoNoFimDoLugar(
            db,
            textoEmEdicao(pref),
            aparicaoDaLinha(parseInt(livro), tipo, id),
        );
        dica.textContent = `Hoje seria a posição ${n}.`;
    }
}

function atualizarPosicao(pref, linha, aoTrocarModo = false) {
    const livro = el(linha, 'ol-livro').value;
    const lugar = el(linha, 'ol-lugar').value;
    const caixa = el(linha, 'ol-posicao');
    caixa.classList.toggle('hidden', !livro || !lugar);
    const modo = el(linha, 'ol-modo').value;
    const seq = el(linha, 'ol-seq');
    seq.classList.toggle('hidden', !livro || !lugar || modo !== 'especifica');
    if (livro && lugar && modo === 'especifica' && aoTrocarModo && !seq.value) {
        const [tipo, id] = partesDoLugar(lugar);
        seq.value = posicaoNoFimDoLugar(
            db,
            textoEmEdicao(pref),
            aparicaoDaLinha(parseInt(livro), tipo, id),
        );
    }
    atualizarDica(pref, linha);
}

function marcarRepetidas(pref) {
    const repetidas = new Set(linhasRepetidas(lerOndeAparece(pref)));
    linhasDoDom(pref).forEach((linha, i) =>
        el(linha, 'ol-repetida').classList.toggle('hidden', !repetidas.has(i)),
    );
}

function atualizarVazio(pref) {
    document
        .getElementById(ids(pref).vazio)
        ?.classList.toggle('hidden', linhasDoDom(pref).length > 0);
}

function criarLinha(pref, linha = {}) {
    const caixa = document.createElement('div');
    caixa.className =
        'onde-linha space-y-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900';
    caixa.innerHTML = htmlDaLinha(linha);
    // Os valores entram depois do HTML (e não por `selected`): vale em qualquer navegador.
    el(caixa, 'ol-livro').value = linha.livroId == null ? '' : String(linha.livroId);
    el(caixa, 'ol-lugar').value = linha.lugar || '';
    el(caixa, 'ol-modo').value = linha.modo || 'fim';
    el(caixa, 'ol-seq').value = linha.sequencia ?? '';
    atualizarPosicao(pref, caixa);
    return caixa;
}

// ─── Ligação com o modal ──────────────────────────────────────

function avisarMudanca(pref) {
    document
        .getElementById(ids(pref).linhas)
        ?.dispatchEvent(new Event('change', { bubbles: true }));
}

// Liga os eventos uma vez só (a linha é recriada, o contêiner não). `opcoes`:
// `aoEscolherLivro(livroId, indiceDaLinha)` roda quando uma linha ganha um livro
// (o salvar do modal usa para sugerir a data de publicação pela primeira linha).
export function iniciarOndeAparece(pref, { aoEscolherLivro = null } = {}) {
    const container = document.getElementById(ids(pref).linhas);
    if (!container || container.dataset.ligado) return;
    container.dataset.ligado = '1';

    container.addEventListener('change', (e) => {
        const linha = e.target.closest?.('.onde-linha');
        if (!linha) return;
        if (e.target.classList.contains('ol-livro')) {
            const livroId = e.target.value;
            el(linha, 'ol-lugar').innerHTML = optionsDeLugar(livroId || null);
            atualizarPosicao(pref, linha);
            if (livroId && aoEscolherLivro)
                aoEscolherLivro(parseInt(livroId), linhasDoDom(pref).indexOf(linha));
        } else if (e.target.classList.contains('ol-lugar')) {
            atualizarPosicao(pref, linha);
        } else if (e.target.classList.contains('ol-modo')) {
            atualizarPosicao(pref, linha, true);
        }
        marcarRepetidas(pref);
    });

    container.addEventListener('click', (e) => {
        const botao = e.target.closest?.('.ol-remover');
        if (!botao || botao.disabled) return;
        botao.closest('.onde-linha')?.remove();
        atualizarVazio(pref);
        marcarRepetidas(pref);
        avisarMudanca(pref);
    });

    document.getElementById(ids(pref).adicionar)?.addEventListener('click', () => {
        adicionarLinhaOndeAparece(pref);
        avisarMudanca(pref);
    });
}

export function adicionarLinhaOndeAparece(pref, linha = {}) {
    const container = document.getElementById(ids(pref).linhas);
    if (!container) return null;
    const nova = criarLinha(pref, linha);
    container.appendChild(nova);
    atualizarVazio(pref);
    marcarRepetidas(pref);
    return nova;
}

// Esvazia as linhas (texto novo e reset do formulário).
export function resetOndeAparece(pref) {
    const container = document.getElementById(ids(pref).linhas);
    if (container) container.innerHTML = '';
    atualizarVazio(pref);
    atualizarTravaOndeAparece(pref);
}

// Ao abrir um texto: uma linha por aparição dele. `item` null = texto novo.
export function carregarOndeAparece(pref, item) {
    const container = document.getElementById(ids(pref).linhas);
    if (!container) return;
    container.innerHTML = '';
    linhasDoTexto(db, item).forEach((linha) => container.appendChild(criarLinha(pref, linha)));
    atualizarVazio(pref);
    marcarRepetidas(pref);
    atualizarTravaOndeAparece(pref);
}

// Com o status Descartado o grupo inteiro fica travado, com o aviso (a origem do
// texto está em "Cortado de"). Voltar o status destrava sem perder nada.
export function atualizarTravaOndeAparece(pref) {
    const descartado = estaDescartado(pref);
    const grupo = document.getElementById(ids(pref).grupo);
    grupo?.querySelectorAll('select, input, button').forEach((c) => {
        c.disabled = descartado;
    });
    document.getElementById(ids(pref).trava)?.classList.toggle('hidden', !descartado);
}
