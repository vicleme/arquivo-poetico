// ============================================================
// ver-texto-da-lista.js: abre o Ver de um texto a partir de uma lista de textos
// desenhada na tela (as listas de Obras, Autores e Referências da aba Conexões) e
// liga o Anterior/Próximo do Ver a essa mesma lista, na ordem em que aparece.
// A lista é lida do DOM (`[data-lista-textos]`), então vale para qualquer tela
// que a use. Poemas e Prosas podem estar misturados na mesma lista.
// ============================================================

import { abrirVisualizacao } from './visualizar.js';

// Os textos da lista que contém `el`, na ordem da tela, sem repetir.
export function itensDaListaNoDom(el) {
    const lista = el?.closest?.('[data-lista-textos]');
    if (!lista) return { itens: [], rotulo: '' };
    const vistos = new Set();
    const itens = [];
    for (const no of lista.querySelectorAll('[data-action="ver-texto-da-lista"]')) {
        const tipo = no.dataset.tipo === 'prosa' ? 'prosa' : 'poema';
        const id = Number(no.dataset.id);
        const chave = `${tipo}:${id}`;
        if (!Number.isFinite(id) || vistos.has(chave)) continue;
        vistos.add(chave);
        itens.push({ tipo, id });
    }
    return { itens, rotulo: lista.dataset.rotulo || '' };
}

export function abrirTextoDaLista(el) {
    const tipo = el.dataset.tipo === 'prosa' ? 'prosa' : 'poema';
    const id = Number(el.dataset.id);
    const { itens, rotulo } = itensDaListaNoDom(el);
    return abrirVisualizacao(tipo, id, itens.length ? { navegar: true, itens, rotulo } : {});
}
