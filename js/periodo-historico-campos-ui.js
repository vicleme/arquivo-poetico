// Período Histórico: interface de Esfera e Categoria no modal (chips com
// sugestões). O estado fica aqui, em memória, enquanto o modal está aberto;
// forms.js lê com `lerCamposPeriodoHistorico()` ao salvar. Só lógica de tela:
// as regras moram em periodos-historicos-campos.js (mesmo desenho de
// periodo-biografico-ui.js, para os dois modais se comportarem igual).

import { db } from './db.js';
import { escapeHtml } from './utils.js';
import { chaveValor, normalizarLista } from './periodo-biografico-campos.js';
import { opcoesDoPeriodoHistorico } from './periodos-historicos-campos.js';

let _esferas = [];
let _categorias = [];

const CLASSE_CHIP =
    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';

function criarChip(texto, aoRemover) {
    const chip = document.createElement('span');
    chip.className = CLASSE_CHIP;
    const rotulo = document.createElement('span');
    rotulo.textContent = texto;
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.textContent = '×';
    remover.title = 'Remover';
    remover.setAttribute('aria-label', `Remover ${texto}`);
    remover.onclick = aoRemover;
    chip.append(rotulo, remover);
    return chip;
}

function preencherDatalist(id, valores) {
    const lista = document.getElementById(id);
    if (!lista) return;
    lista.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
}

// Enter ou vírgula adiciona; sair do campo com texto também adiciona (celular
// não tem Enter confiável). Enter não pode salvar o modal inteiro.
function ligarEntradaDeTags(inputId, aoAdicionar) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const confirmar = () => {
        const valor = input.value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        input.value = '';
        if (valor) aoAdicionar(valor);
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            e.stopPropagation();
            confirmar();
        }
    };
    input.onchange = confirmar;
    input.onblur = confirmar;
}

function render(tipo, chipsId, datalistId, lista, definir) {
    const chips = document.getElementById(chipsId);
    if (chips) {
        chips.innerHTML = '';
        lista.forEach((v) =>
            chips.appendChild(
                criarChip(v, () => {
                    definir(lista.filter((x) => x !== v));
                    renderTudo();
                }),
            ),
        );
    }
    preencherDatalist(
        datalistId,
        opcoesDoPeriodoHistorico(db, tipo).filter(
            (o) => !lista.some((x) => chaveValor(x) === chaveValor(o)),
        ),
    );
}

function renderTudo() {
    render('esferas', 'ph-esferas-chips', 'sugestoes-ph-esferas', _esferas, (l) => {
        _esferas = l;
    });
    render('categorias', 'ph-categorias-chips', 'sugestoes-ph-categorias', _categorias, (l) => {
        _categorias = l;
    });
}

// Abre o modal com os valores do período (ou vazio, para um período novo).
export function preencherCamposPeriodoHistorico(periodo = null) {
    _esferas = normalizarLista(periodo?.esferas);
    _categorias = normalizarLista(periodo?.categorias);
    ligarEntradaDeTags('ph-esferas-input', (v) => {
        _esferas = normalizarLista([..._esferas, v]);
        renderTudo();
    });
    ligarEntradaDeTags('ph-categorias-input', (v) => {
        _categorias = normalizarLista([..._categorias, v]);
        renderTudo();
    });
    renderTudo();
}

// O que foi digitado e ainda não confirmado (Enter/blur) também entra.
export function lerCamposPeriodoHistorico() {
    const pendente = (id) => (document.getElementById(id)?.value || '').replace(/,/g, ' ').trim();
    return {
        esferas: normalizarLista([..._esferas, pendente('ph-esferas-input')]),
        categorias: normalizarLista([..._categorias, pendente('ph-categorias-input')]),
    };
}
