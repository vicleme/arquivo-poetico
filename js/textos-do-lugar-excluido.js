// ============================================================
// textos-do-lugar-excluido.js: o que acontece com Poemas e Prosas quando se
// exclui o Livro, a Parte ou a Seção onde eles estavam (T7, F21-D10; por
// aparição desde a Fase 21, etapa 21-3a).
//
// O texto nunca é excluído, só perde ou muda de lugar, e só a APARIÇÃO daquele
// lugar mexe (um texto pode aparecer em vários lugares):
//   - Livro: as aparições do texto naquele livro (em qualquer Parte ou Seção
//     dele) saem. Se era a única, o texto fica avulso de verdade.
//   - Parte e Seção: a aparição sobe para o pai, no fim da fila, e se o texto já
//     aparece no pai as duas se fundem (ver `subir-nivel-ao-excluir.js`).
// A lista `aparicoes` é a verdade; o espelho (`paiTipo`, `paiId`, `sequencia`,
// `livrosIds`) é recalculado a partir dela.
//
// Lógica pura, sem DOM. O Desfazer devolve tudo: a lista e o espelho de cada
// texto tocado, e a posição de cada id em `livrosIds` no formato antigo.
// ============================================================

import { aplicarEspelho, definirAparicoes, listaDeAparicoes } from './aparicoes-dado.js';
import {
    avisoDeSubida,
    colecaoSobeNivel,
    copiaDoTexto,
    garantirListasDeAparicoes,
    impactoSubidaDoLugar,
    subirConteudoDoLugar,
} from './subir-nivel-ao-excluir.js';

const COLECOES_DE_TEXTO = ['poemas', 'prosas'];

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

export const colecaoTemTextosNoLugar = (col) => col === 'livros' || colecaoSobeNivel(col);

// Os textos que têm alguma aparição no Livro (em qualquer lugar dele). O
// Destino e `livrosIds` antigos entram pela lista, que é lida do formato
// antigo quando o texto ainda não tem uma. `lista` é a aparição de quem sai.
function textosDoLivro(dbRef, id) {
    return COLECOES_DE_TEXTO.flatMap((itemCol) =>
        (dbRef[itemCol] || []).flatMap((texto) => {
            const lista = listaDeAparicoes(dbRef, texto);
            const sai = lista.filter((a) => mesmoId(a.livroId, id));
            const restam = lista.length - sai.length;
            return sai.length ? [{ itemCol, texto, restam }] : [];
        }),
    );
}

// Quantos textos perdem a aparição no Livro, e quantos ficam avulsos, para o
// aviso da confirmação.
export function impactoExclusaoNosTextos(dbRef, col, id) {
    if (col !== 'livros') return { textos: 0, avulsos: 0 };
    const afetados = textosDoLivro(dbRef, id);
    return { textos: afetados.length, avulsos: afetados.filter((x) => x.restam === 0).length };
}

// "2 textos perderão a aparição neste livro (1 ficará avulso)", ou '' sem impacto.
export function avisoDeImpactoNosTextos(impacto) {
    if (!impacto || impacto.textos <= 0) return '';
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    const base = `${plural(impacto.textos, 'texto perderá', 'textos perderão')} a aparição neste livro`;
    if (!impacto.avulsos) return base;
    return `${base} (${plural(impacto.avulsos, 'ficará avulso', 'ficarão avulsos')})`;
}

// Texto do aviso da confirmação de exclusão de Livro, Parte ou Seção, ou ''.
export function avisoDaExclusaoNoLugar(dbRef, col, id) {
    if (colecaoSobeNivel(col)) return avisoDeSubida(impactoSubidaDoLugar(dbRef, col, id));
    return avisoDeImpactoNosTextos(impactoExclusaoNosTextos(dbRef, col, id));
}

// Tira o lugar dos textos e devolve o que precisa para o Desfazer. Livro: as
// aparições dele saem. Parte e Seção: a aparição sobe um nível (`itemExcluido`
// é o registro que acabou de sair do db, de onde sai o novo pai).
export function desvincularTextosDoLugar(dbRef, col, id, itemExcluido = null) {
    if (colecaoSobeNivel(col)) return subirConteudoDoLugar(dbRef, col, id, itemExcluido);
    const semLista = garantirListasDeAparicoes(dbRef, col, itemExcluido);
    // Texto cujo espelho ainda aponta para o Livro sem a lista dizer (dado
    // antigo, ou Coletânea que nunca esteve na lista) também é realinhado.
    const aponta = (t) =>
        (t.paiTipo === 'livro' && mesmoId(t.paiId, id)) ||
        (Array.isArray(t.livrosIds) && t.livrosIds.some((x) => mesmoId(x, id)));
    const aparicoes = [];
    COLECOES_DE_TEXTO.forEach((itemCol) => {
        (dbRef[itemCol] || []).forEach((texto) => {
            const sai = texto.aparicoes.some((a) => mesmoId(a.livroId, id));
            if (!sai && !aponta(texto)) return;
            aparicoes.push(copiaDoTexto(itemCol, texto, !semLista.has(texto)));
            definirAparicoes(
                dbRef,
                texto,
                texto.aparicoes.filter((a) => !mesmoId(a.livroId, id)),
            );
        });
    });
    return { destinos: [], livros: [], aparicoes };
}

export function restaurarTextosDoLugar(dbRef, guardado) {
    (guardado?.destinos || []).forEach((d) => {
        const t = (dbRef[d.itemCol] || []).find((x) => x.id == d.itemId);
        if (!t) return;
        t.paiTipo = d.paiTipo;
        t.paiId = d.paiId;
        t.sequencia = d.sequencia;
        if ('secaoId' in d) t.secaoId = d.secaoId;
    });
    // Formato da T7, antes da lista de aparições: do último para o primeiro,
    // para devolver cada id no índice em que estava.
    [...(guardado?.livros || [])].reverse().forEach(({ itemCol, itemId, indice, valor }) => {
        const t = (dbRef[itemCol] || []).find((x) => x.id == itemId);
        if (!t) return;
        if (!Array.isArray(t.livrosIds)) t.livrosIds = [];
        if (t.livrosIds.some((x) => String(x) === String(valor))) return;
        t.livrosIds.splice(Math.min(indice, t.livrosIds.length), 0, valor);
    });
    // Por aparição: a lista e o espelho voltam como estavam.
    (guardado?.aparicoes || []).forEach((g) => {
        const t = (dbRef[g.itemCol] || []).find((x) => x.id == g.itemId);
        if (!t) return;
        if (g.lista) t.aparicoes = g.lista.map((a) => ({ ...a }));
        else delete t.aparicoes;
        aplicarEspelho(t, g.espelho);
        if ('secaoId' in g) t.secaoId = g.secaoId;
    });
}
