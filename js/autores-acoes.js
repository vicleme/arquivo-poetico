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

// Âncora do último checkbox clicado, pro shift-click estender a seleção
// ao intervalo entre ele e este (mesmo padrão de toggleSelecao em
// selecao-massa.js e de toggleSelecaoPessoa em pessoas-acoes.js). O
// intervalo é o que está entre as duas linhas na lista visível (ordem
// alfabética, já recortada pela busca). Se a âncora saiu da lista
// visível, cai pro clique simples.
let ultimoCheckAutor = null;

export function toggleSelecaoAutor(id, checked, shiftKey = false) {
    if (shiftKey && ultimoCheckAutor !== null && ultimoCheckAutor !== id) {
        const visiveis = getListaVisivelAutores().map((a) => a.id);
        const iAncora = visiveis.indexOf(ultimoCheckAutor);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            visiveis.slice(ini, fim + 1).forEach((aid) => {
                if (checked) selecaoAutores.add(aid);
                else selecaoAutores.delete(aid);
            });
            ultimoCheckAutor = id;
            renderAutores();
            return;
        }
    }
    if (checked) selecaoAutores.add(id);
    else selecaoAutores.delete(id);
    ultimoCheckAutor = id;
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

// Inverte a seleção dos autores que a busca atual mostra; quem está fora
// da lista visível não é tocado.
export function inverterSelecaoAutores() {
    getListaVisivelAutores().forEach(({ id }) => {
        if (selecaoAutores.has(id)) selecaoAutores.delete(id);
        else selecaoAutores.add(id);
    });
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
