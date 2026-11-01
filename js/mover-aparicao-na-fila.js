// ============================================================
// mover-aparicao-na-fila.js: mudar UMA aparição de um texto de lugar dentro do
// mesmo livro, cuidando das duas filas de posição (Fase 21, 21-3c). Só lógica
// pura, sem DOM: o `db` vem por parâmetro, e quem chama grava (`save()`).
//
// É o que o "mover para outro nível" da aba Estrutura faz com Poema e Prosa:
// antes gravava o Destino do texto (`paiTipo`, `paiId`), agora mexe só na
// aparição do lugar onde o botão foi clicado. As outras aparições do texto, em
// outros lugares ou outros livros, não mudam. O espelho (Destino do texto) é
// recalculado a partir da lista por `moverAparicao`.
// ============================================================

import {
    escopoDoLugar,
    listaDeAparicoes,
    mesmoLugar,
    moverAparicao,
    temLugar,
} from './aparicoes-dado.js';
import { caminhoDoDestino } from './aparicoes-do-texto.js';
import { fecharEspaco, getIrmaosPorEscopo, reordenarPosicao, seqOuNull } from './utils.js';

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Lugares (`[paiTipo, paiId]`) do livro onde o texto já tem aparição com lugar,
// para o modal não oferecer um destino onde ele já está.
export function lugaresOcupadosDoTexto(dbRef, texto, livroId) {
    return listaDeAparicoes(dbRef, texto)
        .filter((a) => temLugar(a) && mesmoId(a.livroId, livroId))
        .map(escopoDoLugar);
}

// Move a aparição do texto de `de` para `para` (`{ paiTipo, paiId }`), com a
// posição pedida na fila nova (`null`: fim da fila). A posição velha fecha o
// buraco na fila antiga. Devolve `{ ok: true }` ou `{ ok: false, motivo }`:
//   'sem-aparicao'   o texto não tem aparição com lugar em `de`;
//   'mesmo-lugar'    `de` e `para` são o mesmo lugar;
//   'destino-invalido' `para` não existe;
//   'outro-livro'    `para` é de outro livro (mover entre livros é pelo "Onde aparece");
//   'ja-aparece'     o texto já tem aparição em `para` (não funde em silêncio).
// Nos casos de recusa nada muda.
export function moverAparicaoDeLugar(dbRef, texto, de, para, posicaoDesejada = null) {
    const lista = listaDeAparicoes(dbRef, texto);
    const origem = lista.find((a) => {
        if (!temLugar(a)) return false;
        const [tipo, id] = escopoDoLugar(a);
        return tipo === de?.paiTipo && mesmoId(id, de?.paiId);
    });
    if (!origem) return { ok: false, motivo: 'sem-aparicao' };
    if (de.paiTipo === para?.paiTipo && mesmoId(de.paiId, para?.paiId)) {
        return { ok: false, motivo: 'mesmo-lugar' };
    }
    const alvo = caminhoDoDestino({ paiTipo: para?.paiTipo, paiId: para?.paiId }, dbRef);
    if (!alvo) return { ok: false, motivo: 'destino-invalido' };
    if (!mesmoId(alvo.livroId, origem.livroId)) return { ok: false, motivo: 'outro-livro' };
    // O livro é o da própria aparição (o id do destino pode vir como texto do <select>).
    const destino = { livroId: origem.livroId, parteId: alvo.parteId, secaoId: alvo.secaoId };
    if (lista.some((o) => o !== origem && mesmoLugar(o, destino))) {
        return { ok: false, motivo: 'ja-aparece' };
    }

    // As filas são lidas antes de mexer na lista: o texto sai de uma e entra na outra.
    const irmaosAntigos = getIrmaosPorEscopo(dbRef, de.paiTipo, de.paiId);
    const irmaosNovos = getIrmaosPorEscopo(dbRef, para.paiTipo, para.paiId);
    fecharEspaco(irmaosAntigos, seqOuNull(origem.sequencia));

    let sequencia;
    if (posicaoDesejada !== null && posicaoDesejada !== undefined) {
        const ficha = { id: 'aparicao-movida', sequencia: null };
        reordenarPosicao([...irmaosNovos, ficha], ficha, posicaoDesejada, null);
        sequencia = ficha.sequencia;
    } else {
        sequencia = irmaosNovos.reduce((m, it) => Math.max(m, parseInt(it.sequencia) || 0), 0) + 1;
    }

    const { movida } = moverAparicao(
        dbRef,
        texto,
        { livroId: origem.livroId, parteId: origem.parteId, secaoId: origem.secaoId },
        { ...destino, sequencia },
    );
    return movida ? { ok: true } : { ok: false, motivo: 'destino-invalido' };
}
