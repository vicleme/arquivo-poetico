// ============================================================
// ui-sugestoes-busca-texto.js: caixinha de sugestões sob a busca de
// Metadados das abas Poemas e Prosas (T5, entrega 2 de 3). A lógica mora em
// sugestoes-busca-texto.js e as fontes de valores em
// fontes-sugestoes-busca-texto.js; aqui só a ligação com a caixa, no molde de
// ui-sugestoes-busca-livros.js: abre ao digitar, setas escolhem, Enter ou Tab
// aplicam, Esc fecha, clique também aplica. Não muda a busca em si: aplicar a
// sugestão só escreve na caixa e chama o mesmo `setFiltro...` de quem digita.
// ============================================================

import { db } from './db.js';
import { setFiltroPoemas, setFiltroProsas } from './render-listas.js';
import { aplicarSugestaoBuscaTexto, sugerirBuscaTexto } from './sugestoes-busca-texto.js';
import {
    montarFontesBuscaTexto,
    prefixosOcultosBuscaTexto,
} from './fontes-sugestoes-busca-texto.js';

// Uma configuração por aba. Duas caixinhas independentes, cada uma com o seu estado.
const ABAS = {
    poemas: {
        idCaixa: 'busca-poemas',
        idLista: 'sugestoes-busca-poemas',
        aplicarBusca: (valor) => setFiltroPoemas(valor),
    },
    prosas: {
        idCaixa: 'busca-prosas',
        idLista: 'sugestoes-busca-prosas',
        aplicarBusca: (valor) => setFiltroProsas(valor),
    },
};

const estados = {
    poemas: { sugestao: null, ativo: -1 },
    prosas: { sugestao: null, ativo: -1 },
};

function lista(tabela) {
    return document.getElementById(ABAS[tabela].idLista);
}

function caixa(tabela) {
    return document.getElementById(ABAS[tabela].idCaixa);
}

export function fecharSugestoesBuscaTexto(tabela) {
    estados[tabela] = { sugestao: null, ativo: -1 };
    const el = lista(tabela);
    if (!el) return;
    el.classList.add('hidden');
    el.replaceChildren();
    caixa(tabela)?.setAttribute('aria-expanded', 'false');
}

function marcarAtivo(tabela) {
    const el = lista(tabela);
    if (!el) return;
    Array.from(el.querySelectorAll('[data-indice]')).forEach((filho, i) => {
        const ativo = i === estados[tabela].ativo;
        filho.setAttribute('aria-selected', ativo ? 'true' : 'false');
        filho.classList.toggle('bg-blue-50', ativo);
        filho.classList.toggle('dark:bg-blue-950', ativo);
    });
}

function aplicar(tabela, indice) {
    const input = caixa(tabela);
    const { sugestao } = estados[tabela];
    const item = sugestao?.itens[indice];
    if (!input || !item) return;
    input.value = aplicarSugestaoBuscaTexto(input.value, sugestao.inicio, item);
    ABAS[tabela].aplicarBusca(input.value);
    input.focus();
    // Termo completo: segue digitando; termo pela metade (o prefixo): já oferece o resto.
    atualizarSugestoesBuscaTexto(tabela);
}

export function atualizarSugestoesBuscaTexto(tabela) {
    const input = caixa(tabela);
    const el = lista(tabela);
    if (!input || !el) return;
    const sugestao = sugerirBuscaTexto(input.value, montarFontesBuscaTexto(db, tabela), {
        prefixosOcultos: prefixosOcultosBuscaTexto(tabela),
    });
    if (!sugestao) {
        fecharSugestoesBuscaTexto(tabela);
        return;
    }
    estados[tabela] = { sugestao, ativo: 0 };
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
    // Lista cortada pelo limite: avisa, para ninguém achar que são todas.
    if (sugestao.total > sugestao.itens.length) {
        const aviso = document.createElement('div');
        aviso.dataset.avisoCorte = 'sim';
        aviso.className =
            'sticky bottom-0 px-2.5 py-1 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700';
        aviso.textContent = `Mostrando ${sugestao.itens.length} de ${sugestao.total}. Digite mais letras para filtrar.`;
        el.append(aviso);
    }
    el.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    marcarAtivo(tabela);
}

function aoTeclar(tabela, e) {
    const total = estados[tabela].sugestao?.itens.length ?? 0;
    if (!total) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        estados[tabela].ativo =
            (estados[tabela].ativo + (e.key === 'ArrowDown' ? 1 : -1) + total) % total;
        marcarAtivo(tabela);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        aplicar(tabela, estados[tabela].ativo);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        fecharSugestoesBuscaTexto(tabela);
    }
}

function ligar(tabela) {
    const input = caixa(tabela);
    const el = lista(tabela);
    if (!input || !el || input.dataset.sugestoesLigadas) return;
    input.dataset.sugestoesLigadas = 'sim';
    input.setAttribute('aria-controls', ABAS[tabela].idLista);
    input.setAttribute('aria-autocomplete', 'list');
    input.addEventListener('input', () => atualizarSugestoesBuscaTexto(tabela));
    input.addEventListener('keydown', (e) => aoTeclar(tabela, e));
    input.addEventListener('blur', () => setTimeout(() => fecharSugestoesBuscaTexto(tabela), 120));
    // mousedown (e não click): a caixa perderia o foco antes do clique chegar.
    el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const linha = e.target.closest('[data-indice]');
        if (!linha) return;
        aplicar(tabela, Number(linha.dataset.indice));
    });
}

export function initSugestoesBuscaTexto() {
    Object.keys(ABAS).forEach(ligar);
}
