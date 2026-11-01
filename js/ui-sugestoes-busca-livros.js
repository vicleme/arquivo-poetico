// ============================================================
// ui-sugestoes-busca-livros.js: caixinha de sugestões sob a busca da aba
// Livros. A lógica mora em sugestoes-busca-livros.js; aqui só a ligação com
// a caixa: abre ao digitar, setas escolhem, Enter ou Tab aplicam, Esc fecha,
// clique também aplica. Não muda a busca em si: aplicar a sugestão só escreve
// na caixa e chama a mesma `setBuscaLivros` de quem digita.
// ============================================================

import { db } from './db.js';
import { setBuscaLivros } from './render-listas.js';
import { aplicarSugestaoBuscaLivros, sugerirBuscaLivros } from './sugestoes-busca-livros.js';

const ID_CAIXA = 'filtro-busca-livros';
const ID_LISTA = 'sugestoes-busca-livros';

let estado = { sugestao: null, ativo: -1 };

function lista() {
    return document.getElementById(ID_LISTA);
}

export function fecharSugestoesBuscaLivros() {
    estado = { sugestao: null, ativo: -1 };
    const el = lista();
    if (!el) return;
    el.classList.add('hidden');
    el.replaceChildren();
    document.getElementById(ID_CAIXA)?.setAttribute('aria-expanded', 'false');
}

function marcarAtivo() {
    const el = lista();
    if (!el) return;
    Array.from(el.children).forEach((filho, i) => {
        const ativo = i === estado.ativo;
        filho.setAttribute('aria-selected', ativo ? 'true' : 'false');
        filho.classList.toggle('bg-blue-50', ativo);
        filho.classList.toggle('dark:bg-blue-950', ativo);
    });
}

function aplicar(indice) {
    const caixa = document.getElementById(ID_CAIXA);
    const { sugestao } = estado;
    const item = sugestao?.itens[indice];
    if (!caixa || !item) return;
    caixa.value = aplicarSugestaoBuscaLivros(caixa.value, sugestao.inicio, item);
    setBuscaLivros(caixa.value);
    caixa.focus();
    // Termo completo: segue digitando; termo pela metade (o prefixo): já oferece o resto.
    atualizarSugestoesBuscaLivros();
}

export function atualizarSugestoesBuscaLivros() {
    const caixa = document.getElementById(ID_CAIXA);
    const el = lista();
    if (!caixa || !el) return;
    const sugestao = sugerirBuscaLivros(caixa.value, db.livros, db.autores, db.colaboradores);
    if (!sugestao) {
        fecharSugestoesBuscaLivros();
        return;
    }
    estado = { sugestao, ativo: 0 };
    el.replaceChildren(
        ...sugestao.itens.map((item, i) => {
            const linha = document.createElement('div');
            linha.setAttribute('role', 'option');
            linha.dataset.indice = String(i);
            linha.className =
                'flex items-baseline justify-between gap-3 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-200';
            const nome = document.createElement('span');
            nome.textContent = item.rotulo;
            linha.append(nome);
            if (item.detalhe) {
                const detalhe = document.createElement('span');
                detalhe.className = 'text-xs text-gray-400 dark:text-slate-500';
                detalhe.textContent = item.detalhe;
                linha.append(detalhe);
            }
            return linha;
        }),
    );
    el.classList.remove('hidden');
    caixa.setAttribute('aria-expanded', 'true');
    marcarAtivo();
}

function aoTeclar(e) {
    const total = estado.sugestao?.itens.length ?? 0;
    if (!total) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        estado.ativo = (estado.ativo + (e.key === 'ArrowDown' ? 1 : -1) + total) % total;
        marcarAtivo();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        aplicar(estado.ativo);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        fecharSugestoesBuscaLivros();
    }
}

export function initSugestoesBuscaLivros() {
    const caixa = document.getElementById(ID_CAIXA);
    const el = lista();
    if (!caixa || !el || caixa.dataset.sugestoesLigadas) return;
    caixa.dataset.sugestoesLigadas = 'sim';
    caixa.setAttribute('aria-controls', ID_LISTA);
    caixa.setAttribute('aria-autocomplete', 'list');
    caixa.addEventListener('input', atualizarSugestoesBuscaLivros);
    caixa.addEventListener('keydown', aoTeclar);
    caixa.addEventListener('blur', () => setTimeout(fecharSugestoesBuscaLivros, 120));
    // mousedown (e não click): a caixa perderia o foco antes do clique chegar.
    el.addEventListener('mousedown', (e) => {
        const linha = e.target.closest('[data-indice]');
        if (!linha) return;
        e.preventDefault();
        aplicar(Number(linha.dataset.indice));
    });
}
