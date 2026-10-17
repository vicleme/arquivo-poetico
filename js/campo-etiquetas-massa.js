// ============================================================
// campo-etiquetas-massa.js: campo de etiquetas (chips) das barras de edição
// em massa. Mesmo padrão dos modais: digitar e apertar Enter (ou vírgula)
// vira uma etiqueta; sair do campo com texto também; o × tira. Texto colado
// com vírgulas ou ponto e vírgula vira várias etiquetas.
//
// O estado fica em memória, por campo de texto, e a barra o lê ao aplicar.
// Só lógica de tela: o que fazer com os valores mora em massa-valores.js.
// ============================================================

import { etiquetasDoTexto, valoresDaOperacao } from './massa-valores.js';

const CLASSE_CHIP =
    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';

// inputId -> { input, chipsId, lista, chave }. `input` é o elemento ligado:
// se o painel for desenhado de novo (campo novo no DOM com o mesmo id), o
// estado velho é descartado e o campo novo é religado.
const estados = new Map();

function desenhar(inputId) {
    const estado = estados.get(inputId);
    const chips = document.getElementById(estado.chipsId);
    if (!chips) return;
    chips.innerHTML = '';
    estado.lista.forEach((valor) => {
        const chip = document.createElement('span');
        chip.className = CLASSE_CHIP;
        const rotulo = document.createElement('span');
        rotulo.textContent = valor;
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.textContent = '×';
        remover.title = 'Remover';
        remover.setAttribute('aria-label', `Remover ${valor}`);
        remover.onclick = () => {
            estado.lista = estado.lista.filter((x) => x !== valor);
            desenhar(inputId);
        };
        chip.append(rotulo, remover);
        chips.appendChild(chip);
    });
}

// Passa o texto digitado para a lista de etiquetas (sem repetir).
function confirmar(inputId) {
    const input = document.getElementById(inputId);
    const estado = estados.get(inputId);
    if (!input || !estado) return;
    const novas = etiquetasDoTexto(input.value);
    input.value = '';
    if (novas.length === 0) return;
    estado.lista = valoresDaOperacao({ valores: [...estado.lista, ...novas] });
    desenhar(inputId);
}

// Liga o campo (uma vez só) e, se `chave` mudou desde a última chamada,
// esvazia as etiquetas: o que valia para Esfera não vale para Categoria.
export function prepararEtiquetasMassa({ inputId, chipsId, chave, placeholder }) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let estado = estados.get(inputId);
    if (!estado || estado.input !== input) {
        estado = { input, chipsId, lista: [], chave };
        estados.set(inputId, estado);
        input.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                e.stopPropagation();
                confirmar(inputId);
            } else if (e.key === 'Backspace' && input.value === '') {
                // Apagar com o campo vazio tira a última etiqueta.
                const atual = estados.get(inputId);
                if (atual.lista.length) {
                    atual.lista = atual.lista.slice(0, -1);
                    desenhar(inputId);
                }
            }
        };
        input.onchange = () => confirmar(inputId);
        input.onblur = () => confirmar(inputId);
        input.addEventListener('paste', () =>
            setTimeout(() => {
                if (/[,;\n]/.test(input.value)) confirmar(inputId);
            }, 0),
        );
    } else if (estado.chave !== chave) {
        estado.lista = [];
        input.value = '';
    }
    estado.chave = chave;
    if (placeholder !== undefined) input.placeholder = placeholder;
    desenhar(inputId);
}

// Etiquetas atuais, já com o que estiver digitado e ainda não confirmado.
export function lerEtiquetasMassa(inputId) {
    confirmar(inputId);
    return [...(estados.get(inputId)?.lista || [])];
}

export function limparEtiquetasMassa(inputId) {
    const estado = estados.get(inputId);
    const input = document.getElementById(inputId);
    if (input) input.value = '';
    if (!estado) return;
    estado.lista = [];
    desenhar(inputId);
}
