// ============================================================
// coletaneas-do-texto.js: em quais Coletâneas um Poema ou uma
// Prosa aparece. Só lógica pura, sem DOM.
//
// Fonte única para o Ver e para as exportações (.md, .csv, .json,
// .pdf e .docx) mostrarem a linha "Coletâneas". O vínculo vive em
// `itensColetanea` (o item aponta o texto por `refTipo` + `refId` e
// a Parte por `parteId`; a Parte aponta a Coletânea por `livroId`).
//
// Os dados vêm por parâmetro (`dbRef`), como em `estrutura-livro.js`,
// para testar sem o `db` real.
// ============================================================

const sequenciaDe = (c) => parseInt(c.sequencia) || 9999;

// Títulos das Coletâneas que trazem o texto, na ordem do acervo (a mesma
// da aba Coletâneas: por sequência, sem sequência no fim). Cada Coletânea
// entra uma vez só, mesmo que o texto esteja em duas Partes dela.
// `tipo` é 'poema' ou 'prosa'. Sem id (texto ainda não salvo), lista vazia.
export function titulosDeColetaneasDoTexto(dbRef, tipo, id) {
    if (!id) return [];
    const partes = dbRef.partes || [];
    const livros = dbRef.livros || [];
    const achadas = [];
    (dbRef.itensColetanea || [])
        .filter((i) => i.refTipo === tipo && i.refId == id)
        .forEach((item) => {
            const parte = partes.find((p) => p.id == item.parteId);
            const col = parte
                ? livros.find((l) => l.id == parte.livroId && l.tipo === 'Coletânea')
                : null;
            if (col && !achadas.some((c) => c.id == col.id)) achadas.push(col);
        });
    return achadas
        .sort((a, b) => sequenciaDe(a) - sequenciaDe(b))
        .map((c) => c.titulo)
        .filter(Boolean);
}
