// ============================================================
// aviso-aparicoes.js: o aviso de uma vez só que o app dá quando a lista nova de
// aparições é criada nos textos (Fase 21, 21-1b-2). Sem DOM e sem importar o
// `db`. O aviso viaja em `history.state` porque a importação de um backup
// recarrega a página logo depois de migrar.
// ============================================================

const CHAVE = 'aparicoesAviso';

// `info`: { textos, copia } (`copia`: true, false ou undefined quando não se sabe).
// Vai em `history.state` (mesmo caminho do aviso pós-esvaziar), que sobrevive
// ao `location.reload()` da importação e some com a aba.
export function guardarAvisoDeAparicoes(info, historico = globalThis.history) {
    if (!historico || !info || !(info.textos > 0)) return false;
    try {
        const estado = { ...(historico.state || {}) };
        estado[CHAVE] = { textos: info.textos, copia: info.copia };
        historico.replaceState(estado, '');
        return true;
    } catch {
        return false;
    }
}

// Lê e apaga o aviso pendente (devolve null se não há).
export function lerAvisoDeAparicoes(historico = globalThis.history) {
    try {
        const estado = historico?.state;
        const info = estado && typeof estado === 'object' ? estado[CHAVE] : null;
        if (!info) return null;
        const resto = { ...estado };
        delete resto[CHAVE];
        historico.replaceState(Object.keys(resto).length ? resto : null, '');
        return info.textos > 0 ? info : null;
    } catch {
        return null;
    }
}

export function textoDoAvisoDeAparicoes(info) {
    const quantos = info.textos === 1 ? '1 texto' : `${info.textos} textos`;
    const copia =
        info.copia === true
            ? ' Uma cópia automática foi guardada antes da mudança.'
            : info.copia === false
              ? ' Não consegui guardar a cópia automática antes: baixe um backup em JSON por segurança.'
              : '';
    return `O acervo ganhou a lista nova de onde cada texto aparece (${quantos}). Nada mudou na tela e os campos antigos continuam como estavam.${copia}`;
}
