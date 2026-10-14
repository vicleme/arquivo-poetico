// ============================================================
// ocultas-periodos.js — Estado de "Mostrar ocultas" para Períodos Biográficos.
//
// Um interruptor só, em memória, compartilhado pelas telas que listam
// períodos (a aba Período Biográfico e, por tabela, a coluna Época Retratada
// e as sugestões do modal do texto). Nunca é guardado: volta a esconder ao
// recarregar a página. O botão "Exibir ocultas" da aba muda este estado e vale
// para pessoas e períodos ao mesmo tempo.
// ============================================================

let exibirOcultas = false;

export function exibindoOcultasDosPeriodos() {
    return exibirOcultas;
}

export function definirExibirOcultasDosPeriodos(valor) {
    exibirOcultas = !!valor;
}

// Formato que as funções de periodo-biografico-campos.js esperam.
export const opcoesOcultasDosPeriodos = () => ({ incluirOcultas: exibirOcultas });
