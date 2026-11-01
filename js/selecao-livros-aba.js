// ============================================================
// selecao-livros-aba.js: seleção por caixinha e barra de download da aba
// Livros (Fase 19, etapa 7, entrega 3). A parte com DOM; a lógica de escopo
// mora em selecao-livros.js e o arquivo em baixar-livros.js.
//
// No molde da aba Tag clusters: o botão "Selecionar" liga o modo e põe uma
// caixinha em cada card; "Só selecionados" no select de escopo baixa só os
// marcados. Seleção e modo só em memória. Marcar não redesenha a aba (isso
// recarregaria as capas e tiraria o foco da caixinha): só põe as marcas em dia.
//
// Import circular com render-listas.js, como em autores-acoes.js: cada lado
// só usa o do outro dentro de funções.
// ============================================================

import { db } from './db.js';
import { mostrarAviso } from './utils.js';
import {
    baixarLivros,
    getFormatoBaixarLivros,
    salvarFormatoBaixarLivros,
    sincronizarCaixaEstruturaLivros,
} from './baixar-livros.js';
import {
    ESCOPO_PADRAO_LIVROS,
    ESCOPOS_DOWNLOAD_LIVROS,
    intervaloDeIds,
    livrosDoEscopo,
    nomeBaseDownloadLivros,
    podarSelecaoLivros,
    rotulosEscopoLivros,
} from './selecao-livros.js';
import {
    filtrandoLivros,
    livrosEmOrdemDaAba,
    livrosVisiveisDaAba,
    renderLivros,
} from './render-listas.js';

export const selecaoLivros = new Set();
export const CLASSES_MARCADO_LIVRO = ['ring-2', 'ring-blue-400', 'dark:ring-blue-500'];

let modoSelecao = false;
let ultimoCheck = null;

export function modoSelecaoLivrosAtivo() {
    return modoSelecao;
}

const selectEscopo = () => document.getElementById('livros-baixar-escopo');
const selectFormato = () => document.getElementById('livros-baixar-formato');

// Põe as caixinhas e o anel dos cards em dia com a seleção, sem redesenhar.
function sincronizarMarcas() {
    document.querySelectorAll('#lista-livros [data-livro-card]').forEach((card) => {
        const marcado = selecaoLivros.has(Number(card.dataset.livroCard));
        CLASSES_MARCADO_LIVRO.forEach((c) => card.classList.toggle(c, marcado));
        const caixa = card.querySelector('input[data-action="toggle-livro"]');
        if (caixa) caixa.checked = marcado;
    });
}

// Barra de contagem, botão "Selecionar", rótulos com contagem do select de
// escopo e formato lembrado. renderLivros chama a cada redesenho.
export function atualizarControlesDownloadLivros(visiveis, total) {
    const podada = podarSelecaoLivros(db.livros, selecaoLivros);
    if (podada.size !== selecaoLivros.size) {
        selecaoLivros.clear();
        podada.forEach((id) => selecaoLivros.add(id));
    }
    const n = selecaoLivros.size;

    document.getElementById('livros-selecao-barra')?.classList.toggle('hidden', !modoSelecao);
    const botao = document.getElementById('livros-modo-selecao');
    if (botao) {
        botao.setAttribute('aria-pressed', String(modoSelecao));
        botao.textContent = modoSelecao ? '☑ Selecionando' : '☐ Selecionar';
    }
    const contagem = document.getElementById('livros-selecao-contagem');
    if (contagem) {
        contagem.textContent = n
            ? `${n} ${n === 1 ? 'livro selecionado' : 'livros selecionados'}`
            : 'Nada selecionado. Marque as caixinhas dos cards.';
    }

    const select = selectEscopo();
    if (select) {
        const rotulos = rotulosEscopoLivros({ total, filtrados: visiveis, selecionados: n });
        ESCOPOS_DOWNLOAD_LIVROS.forEach((escopo) => {
            const opcao = select.querySelector(`option[value="${escopo}"]`);
            if (opcao) opcao.textContent = rotulos[escopo];
        });
        const opcaoSelecao = select.querySelector('option[value="selecao"]');
        if (opcaoSelecao) {
            opcaoSelecao.hidden = !n;
            opcaoSelecao.disabled = !n;
        }
        if (!n && select.value === 'selecao') select.value = ESCOPO_PADRAO_LIVROS;
    }

    const formato = selectFormato();
    if (formato) {
        formato.value = getFormatoBaixarLivros();
        const barra = formato.parentElement;
        sincronizarCaixaEstruturaLivros(barra, formato.value);
        formato.onchange = () => {
            salvarFormatoBaixarLivros(formato.value);
            sincronizarCaixaEstruturaLivros(barra, formato.value);
        };
    }
    sincronizarMarcas();
}

function usarEscopoSelecaoSeHouver() {
    const select = selectEscopo();
    if (select && selecaoLivros.size) select.value = 'selecao';
}

function reatualizar() {
    atualizarControlesDownloadLivros(livrosVisiveisDaAba().length, db.livros.length);
}

export function alternarModoSelecaoLivros() {
    modoSelecao = !modoSelecao;
    if (!modoSelecao) {
        selecaoLivros.clear();
        ultimoCheck = null;
    }
    renderLivros();
}

// Marca ou desmarca um livro. Shift estende ao intervalo entre o último
// clicado e este, na lista que a tela mostra.
export function toggleSelecaoLivro(id, checked, shiftKey = false) {
    const estavaVazia = selecaoLivros.size === 0;
    const ids =
        shiftKey && ultimoCheck !== null
            ? intervaloDeIds(
                  livrosVisiveisDaAba().map((l) => l.id),
                  ultimoCheck,
                  id,
              )
            : [id];
    ids.forEach((i) => (checked ? selecaoLivros.add(i) : selecaoLivros.delete(i)));
    ultimoCheck = id;
    reatualizar();
    if (estavaVazia) usarEscopoSelecaoSeHouver();
}

// Marca todos os livros que a tela mostra agora (busca e filtros).
export function marcarTodosLivros() {
    livrosVisiveisDaAba().forEach((l) => selecaoLivros.add(l.id));
    reatualizar();
    usarEscopoSelecaoSeHouver();
}

export function limparSelecaoLivros() {
    selecaoLivros.clear();
    ultimoCheck = null;
    reatualizar();
}

// Botão "⬇ Baixar" da aba: lê o escopo e o formato dos selects ao lado.
export function baixarLivrosDaAba() {
    const escopoLido = selectEscopo()?.value;
    const escopo = ESCOPOS_DOWNLOAD_LIVROS.includes(escopoLido) ? escopoLido : ESCOPO_PADRAO_LIVROS;
    const formato = selectFormato()?.value || getFormatoBaixarLivros();
    salvarFormatoBaixarLivros(formato);

    const podada = podarSelecaoLivros(db.livros, selecaoLivros);
    if (podada.size !== selecaoLivros.size) {
        selecaoLivros.clear();
        podada.forEach((id) => selecaoLivros.add(id));
    }
    if (escopo === 'selecao' && selecaoLivros.size === 0) {
        reatualizar();
        return mostrarAviso('Marque ao menos um livro para baixar a seleção.');
    }
    const lista = livrosDoEscopo(escopo, {
        todos: livrosEmOrdemDaAba(),
        filtrados: livrosVisiveisDaAba(),
        selecao: selecaoLivros,
    });
    baixarLivros(lista, formato, nomeBaseDownloadLivros(escopo, filtrandoLivros()));
}
