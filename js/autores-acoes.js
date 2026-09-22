// ============================================================
// autores-acoes.js — Estado e ações da aba Autores: caixa de busca
// por campo, seleção (checkbox por card) e exportação da seleção.
//
// Poemas/Prosas guardam esse estado dentro de render-listas.js e
// suas ações em selecao-massa.js, ambos pensados pra tabela (colunas,
// paginação, edição em massa). Autores é uma lista de cards e só
// precisa do básico, então tem módulo próprio, pequeno — em vez de
// forçar 'autores' dentro do `cfg(tabela)` de selecao-massa.js, que
// faria cada ação em massa de lá ter que tratar um caso que não
// existe pra Autor.
//
// A lógica pura mora em busca-autores.js (filtro) e exportar-autores.js
// (arquivos); aqui fica só o que toca estado de tela.
//
// Import circular com render-listas.js é o mesmo do par
// selecao-massa.js/render-listas.js (ver header de lá): renderAutores()
// lê `selecaoAutores`/`getListaVisivelAutores` daqui, e este módulo
// chama renderAutores() depois de cada ação. Seguro porque nenhum dos
// dois lados usa o import do outro no topo do módulo, só dentro de
// funções.
// ============================================================

import { db } from './db.js';
import { opcoesBuscaPadrao } from './utils.js';
import { filtrarAutores } from './busca-autores.js';
import {
    exportarAutoresJson,
    exportarAutoresMarkdown,
    exportarAutoresCsv,
} from './exportar-autores.js';
import { renderAutores } from './render-listas.js';

export const selecaoAutores = new Set();

let filtroAutores = '';
let opcoesBuscaAutores = opcoesBuscaPadrao();

export function getFiltroAutores() {
    return filtroAutores;
}

export function setFiltroAutores(valor) {
    filtroAutores = valor || '';
    renderAutores();
}

export function setOpcaoBuscaAutores(chave, valor) {
    opcoesBuscaAutores = { ...opcoesBuscaAutores, [chave]: !!valor };
    renderAutores();
}

// Autores na ordem alfabética da lista, já filtrados pela busca atual.
export function getListaVisivelAutores() {
    const ordenados = [...db.autores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return filtrarAutores(ordenados, filtroAutores, opcoesBuscaAutores);
}

export function toggleSelecaoAutor(id, checked) {
    if (checked) selecaoAutores.add(id);
    else selecaoAutores.delete(id);
    renderAutores();
}

// Marca/desmarca todos os que a busca atual mostra (não só os que
// cabem na tela — aqui não há paginação).
export function toggleSelecaoTodosAutores(checked) {
    getListaVisivelAutores().forEach((a) => {
        if (checked) selecaoAutores.add(a.id);
        else selecaoAutores.delete(a.id);
    });
    renderAutores();
}

export function limparSelecaoAutores() {
    selecaoAutores.clear();
    renderAutores();
}

// Tira da seleção ids de Autores que já não existem (excluídos depois
// de marcados) — chamado a cada render, pra o contador nunca contar
// fantasma.
export function podarSelecaoAutores() {
    const existentes = new Set(db.autores.map((a) => a.id));
    [...selecaoAutores].forEach((id) => {
        if (!existentes.has(id)) selecaoAutores.delete(id);
    });
}

export function atualizarBarraSelecaoAutores() {
    const barra = document.getElementById('barra-acoes-autores');
    const contador = document.getElementById('contador-selecao-autores');
    if (!barra) return;
    const n = selecaoAutores.size;
    barra.classList.toggle('hidden', n === 0);
    if (contador) {
        contador.innerText = `${n} autor${n !== 1 ? 'es' : ''} selecionado${n !== 1 ? 's' : ''}`;
    }
}

export function exportarSelecaoAutoresJson() {
    exportarAutoresJson([...selecaoAutores]);
}

export function exportarSelecaoAutoresMarkdown() {
    exportarAutoresMarkdown([...selecaoAutores]);
}

export function exportarSelecaoAutoresCsv() {
    exportarAutoresCsv([...selecaoAutores]);
}
