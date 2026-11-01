// ============================================================
// abrir-lista-origem.js: o botão "Ver os textos desta origem na lista" de cada
// origem da seção Fora do acervo (aba Conexões). Abre Poemas (ou Prosas, quando
// a origem só aparece em prosas) já filtrado por `origem:"Nome"`, a mesma
// consulta do clique nas barras e no mapa das Estatísticas. O nome e os ids dos
// textos vêm do próprio botão (`data-origem`, `data-poemas`, `data-prosas`).
// ============================================================

import { escaparAspasBusca } from './utils.js';
import { abrirListaComConsulta } from './render-listas.js';

const idsDe = (texto) =>
    String(texto || '')
        .split(',')
        .map(Number)
        .filter(Number.isFinite);

// A consulta de busca de uma origem. Sem nome, não há o que buscar.
export function consultaDaOrigem(origem) {
    const nome = String(origem || '').trim();
    return nome ? `origem:"${escaparAspasBusca(nome)}"` : '';
}

export function abrirListaDaOrigem(el) {
    const consulta = consultaDaOrigem(el?.dataset?.origem);
    if (!consulta) return;
    abrirListaComConsulta(
        consulta,
        idsDe(el.dataset.poemas),
        idsDe(el.dataset.prosas),
        `Filtrando por ${consulta}`,
    );
}
