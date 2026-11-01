// temas-massa.js: edição em massa da Valência na aba Temas (30/10/2026).
//
// Parte pura (sem DOM): estado da seleção, `aplicarValenciaEmMassa` e
// `aplicarValenciasSugeridas`, ambas devolvendo `desfazer`. A tela
// (caixas, barra, avisos) mora em temas-massa-ui.js.

import { normalizarValenciaTema, definirValenciaDoTema } from './temas.js';
import { valenciaSugeridaDoTema } from './valencia-seed.js';

export const selecaoTemas = new Set();

// Ids dos Temas que a lista mostra agora (filtros e busca aplicados), na
// ordem da tela. A aba atualiza a cada render; "Selecionar todos" e o
// Shift-clique usam esta lista, nunca o cadastro inteiro.
let visiveisTemas = [];
let ultimoCheckTema = null;

export function definirTemasVisiveis(ids) {
    visiveisTemas = (ids || []).map((id) => String(id));
    // Tema que saiu da tela (filtro, exclusão) não fica selecionado às cegas.
    [...selecaoTemas].forEach((id) => {
        if (!visiveisTemas.includes(String(id))) selecaoTemas.delete(id);
    });
}

export function temasVisiveis() {
    return [...visiveisTemas];
}

export function alternarSelecaoTema(id, marcado, shift = false) {
    const chave = String(id);
    if (shift && ultimoCheckTema !== null && ultimoCheckTema !== chave) {
        const i = visiveisTemas.indexOf(ultimoCheckTema);
        const j = visiveisTemas.indexOf(chave);
        if (i !== -1 && j !== -1) {
            const [ini, fim] = i < j ? [i, j] : [j, i];
            visiveisTemas.slice(ini, fim + 1).forEach((x) => {
                if (marcado) selecaoTemas.add(x);
                else selecaoTemas.delete(x);
            });
            ultimoCheckTema = chave;
            return;
        }
    }
    if (marcado) selecaoTemas.add(chave);
    else selecaoTemas.delete(chave);
    ultimoCheckTema = chave;
}

export function alternarSelecaoTodosTemas(marcado) {
    visiveisTemas.forEach((x) => {
        if (marcado) selecaoTemas.add(x);
        else selecaoTemas.delete(x);
    });
}

export function limparSelecaoTemas() {
    selecaoTemas.clear();
    ultimoCheckTema = null;
}

// Retrato da valência dos Temas que a operação pode mexer, para o desfazer.
export function retrato(temas) {
    return temas.map((t) => ({
        tema: t,
        tinha: Object.prototype.hasOwnProperty.call(t, 'valencia'),
        valencia: t.valencia,
    }));
}

export function restaurar(antes) {
    antes.forEach(({ tema, tinha, valencia }) => {
        if (tinha) tema.valencia = valencia;
        else delete tema.valencia;
    });
}

// Define (ou, com '', limpa) a valência dos Temas `ids`. Só conta como
// alterado o Tema cuja valência de fato muda. Devolve
// `{ ok, motivo?, alterados, iguais, valencia, desfazer }`.
export function aplicarValenciaEmMassa(dbRef, ids, valor) {
    const bruto = String(valor ?? '');
    const valencia = normalizarValenciaTema(bruto);
    if (bruto !== '' && !valencia) return { ok: false, motivo: 'valencia-invalida' };
    const alvo = new Set((ids || []).map(String));
    const temas = (dbRef.temas || []).filter((t) => alvo.has(String(t.id)));
    if (temas.length === 0) return { ok: false, motivo: 'sem-temas' };

    const antes = retrato(temas);
    let alterados = 0;
    temas.forEach((t) => {
        if (normalizarValenciaTema(t.valencia) === valencia) return;
        definirValenciaDoTema(t, valencia);
        alterados += 1;
    });
    return {
        ok: true,
        alterados,
        iguais: temas.length - alterados,
        valencia,
        desfazer: () => restaurar(antes),
    };
}

// Preenche a valência sugerida (valencia-seed.js) nos Temas do acervo que
// estão na amostra E ainda não têm valência. Nunca troca uma valência já
// definida. Devolve `{ ok, aplicados, jaTinham, foraDaAmostra, desfazer }`.
export function aplicarValenciasSugeridas(dbRef) {
    const temas = dbRef.temas || [];
    const afetados = [];
    let jaTinham = 0;
    let foraDaAmostra = 0;
    temas.forEach((t) => {
        const sugerida = valenciaSugeridaDoTema(t.nome);
        if (!sugerida) {
            foraDaAmostra += 1;
            return;
        }
        if (normalizarValenciaTema(t.valencia)) {
            jaTinham += 1;
            return;
        }
        afetados.push({ tema: t, sugerida });
    });
    const antes = retrato(afetados.map((a) => a.tema));
    afetados.forEach(({ tema, sugerida }) => definirValenciaDoTema(tema, sugerida));
    return {
        ok: true,
        aplicados: afetados.length,
        jaTinham,
        foraDaAmostra,
        desfazer: () => restaurar(antes),
    };
}

// Acrescenta os Temas `ids` (os que existem no cadastro) ao Assunto
// `assuntoId`, sem repetir e sem tirar nada. Devolve
// `{ ok, motivo?, adicionados, jaTinham, assunto, desfazer }`; motivos de
// recusa: 'assunto-inexistente' e 'sem-temas'. `desfazer()` devolve a lista
// de Temas do Assunto ao que era.
export function adicionarTemasAoAssuntoEmMassa(dbRef, assuntoId, ids) {
    const assunto = (dbRef.assuntos || []).find((a) => String(a.id) === String(assuntoId));
    if (!assunto) return { ok: false, motivo: 'assunto-inexistente' };
    const alvo = new Set((ids || []).map(String));
    const temas = (dbRef.temas || []).filter((t) => alvo.has(String(t.id)));
    if (temas.length === 0) return { ok: false, motivo: 'sem-temas' };
    const antes = Array.isArray(assunto.temaIds) ? [...assunto.temaIds] : [];
    const novos = temas.filter((t) => !antes.some((x) => String(x) === String(t.id)));
    if (novos.length > 0) assunto.temaIds = [...antes, ...novos.map((t) => t.id)];
    return {
        ok: true,
        adicionados: novos.length,
        jaTinham: temas.length - novos.length,
        assunto,
        desfazer() {
            assunto.temaIds = antes;
        },
    };
}
