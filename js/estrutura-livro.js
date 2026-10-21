// ============================================================
// estrutura-livro.js — Árvore do livro (Parte → Seção → Poema,
// Prosa e Elemento), só lógica pura, sem DOM.
//
// Fonte única da ordem e do pertencimento: a aba Estrutura
// (render-estrutura.js) e a seção "Estrutura" do Ver do Livro
// (visualizar-livro.js) leem daqui, para nunca divergirem.
//
// Os dados vêm por parâmetro (`dbRef`), como em
// `contarConteudoDoLivro`, para testar sem o `db` real.
// ============================================================

// Itens vêm embrulhados como { tipo, dados }: a sequência real está em
// item.dados.sequencia. Sem sequência (ou 0), o item vai para o fim.
export function ordenarPorSeq(lista) {
    return [...lista].sort((a, b) => {
        const seqA = a.dados ? a.dados.sequencia : a.sequencia;
        const seqB = b.dados ? b.dados.sequencia : b.sequencia;
        return (parseInt(seqA) || 9999) - (parseInt(seqB) || 9999);
    });
}

const lista = (dbRef, nome) => dbRef[nome] || [];

export function filhosTopoDoLivro(dbRef, livroId) {
    return ordenarPorSeq([
        ...lista(dbRef, 'partes')
            .filter((p) => p.livroId == livroId)
            .map((p) => ({ tipo: 'parte', dados: p })),
        ...lista(dbRef, 'secoes')
            .filter((s) => s.paiTipo === 'livro' && s.paiId == livroId)
            .map((s) => ({ tipo: 'secao', dados: s })),
        ...lista(dbRef, 'elementos')
            .filter((e) => e.paiTipo === 'livro' && e.paiId == livroId)
            .map((e) => ({ tipo: 'elemento', dados: e })),
        ...lista(dbRef, 'poemas')
            .filter((p) => p.paiTipo === 'livro' && p.paiId == livroId)
            .map((p) => ({ tipo: 'poema', dados: p })),
        ...lista(dbRef, 'prosas')
            .filter((p) => p.paiTipo === 'livro' && p.paiId == livroId)
            .map((p) => ({ tipo: 'prosa', dados: p })),
    ]);
}

export function filhosDaParte(dbRef, parteId) {
    return ordenarPorSeq([
        ...lista(dbRef, 'secoes')
            .filter((s) => s.paiTipo === 'parte' && s.paiId == parteId)
            .map((s) => ({ tipo: 'secao', dados: s })),
        ...lista(dbRef, 'elementos')
            .filter((e) => e.paiTipo === 'parte' && e.paiId == parteId)
            .map((e) => ({ tipo: 'elemento', dados: e })),
        ...lista(dbRef, 'poemas')
            .filter((p) => p.paiTipo === 'parte' && p.paiId == parteId)
            .map((p) => ({ tipo: 'poema', dados: p })),
        ...lista(dbRef, 'prosas')
            .filter((p) => p.paiTipo === 'parte' && p.paiId == parteId)
            .map((p) => ({ tipo: 'prosa', dados: p })),
    ]);
}

export function filhosDaSecao(dbRef, secaoId) {
    return ordenarPorSeq([
        ...lista(dbRef, 'elementos')
            .filter((e) => e.paiTipo === 'secao' && e.paiId == secaoId)
            .map((e) => ({ tipo: 'elemento', dados: e })),
        ...lista(dbRef, 'poemas')
            .filter((p) => p.paiTipo === 'secao' && p.paiId == secaoId)
            .map((p) => ({ tipo: 'poema', dados: p })),
        ...lista(dbRef, 'prosas')
            .filter((p) => (p.paiTipo === 'secao' && p.paiId == secaoId) || p.secaoId == secaoId)
            .map((p) => ({ tipo: 'prosa', dados: p })),
    ]);
}

function comFilhos(dbRef, no) {
    if (no.tipo === 'parte') {
        return { ...no, filhos: filhosDaParte(dbRef, no.dados.id).map((f) => comFilhos(dbRef, f)) };
    }
    if (no.tipo === 'secao') {
        return { ...no, filhos: filhosDaSecao(dbRef, no.dados.id).map((f) => comFilhos(dbRef, f)) };
    }
    return no;
}

// Árvore do livro para leitura: { arvore, vinculados }.
// - Livro comum: Partes, Seções, Elementos, Poemas e Prosas na ordem da aba Estrutura.
// - Coletânea: Partes (por sequência) e os itens de cada uma (`itensColetanea`).
// - `vinculados`: poemas e prosas ligados ao livro só por `livrosIds`, sem
//   posição na árvore (não fingem uma posição que não existe). Fora da árvore
//   por definição; ordenados por título. Coletânea não tem vinculados.
export function montarArvoreDoLivro(dbRef, livroId) {
    const livro = lista(dbRef, 'livros').find((l) => String(l.id) === String(livroId));
    if (!livro) return { arvore: [], vinculados: [] };

    if (livro.tipo === 'Coletânea') {
        const partes = ordenarPorSeq(
            lista(dbRef, 'partes')
                .filter((p) => p.livroId == livroId)
                .map((p) => ({ tipo: 'parte', dados: p })),
        );
        const arvore = partes.map((p) => ({
            ...p,
            filhos: ordenarPorSeq(
                lista(dbRef, 'itensColetanea')
                    .filter((i) => i.parteId == p.dados.id)
                    .map((i) => ({ tipo: 'item', dados: i })),
            ),
        }));
        return { arvore, vinculados: [] };
    }

    const arvore = filhosTopoDoLivro(dbRef, livroId).map((n) => comFilhos(dbRef, n));

    const naArvore = new Set();
    const coletar = (nos) =>
        nos.forEach((n) => {
            if (n.tipo === 'poema' || n.tipo === 'prosa') naArvore.add(`${n.tipo}-${n.dados.id}`);
            if (n.filhos) coletar(n.filhos);
        });
    coletar(arvore);

    const liga = (t) =>
        Array.isArray(t.livrosIds) && t.livrosIds.some((x) => String(x) === String(livroId));
    const vinculados = ['poema', 'prosa']
        .flatMap((tipo) =>
            lista(dbRef, tipo + 's')
                .filter((t) => liga(t) && !naArvore.has(`${tipo}-${t.id}`))
                .map((t) => ({ tipo, dados: t })),
        )
        .sort((a, b) =>
            String(a.dados.titulo || '').localeCompare(String(b.dados.titulo || ''), 'pt-BR'),
        );

    return { arvore, vinculados };
}

// Árvore de uma Parte só (Seções, Elementos, Poemas e Prosas dela, na ordem da aba
// Estrutura) e de uma Seção só (Elementos, Poemas e Prosas). Mesmo formato de
// `montarArvoreDoLivro` ({ arvore, vinculados }), para o Ver de Parte e de Seção
// reaproveitarem o desenho da Estrutura. Sem `vinculados`: o vínculo por
// `livrosIds` é do Livro, não de uma Parte nem de uma Seção.
export function montarArvoreDaParte(dbRef, parteId) {
    return {
        arvore: filhosDaParte(dbRef, parteId).map((n) => comFilhos(dbRef, n)),
        vinculados: [],
    };
}

export function montarArvoreDaSecao(dbRef, secaoId) {
    return {
        arvore: filhosDaSecao(dbRef, secaoId).map((n) => comFilhos(dbRef, n)),
        vinculados: [],
    };
}

// Contagem por tipo em toda a árvore mais os vinculados (um texto conta uma vez).
export function contarNosDaArvore({ arvore, vinculados = [] }) {
    const c = { partes: 0, secoes: 0, poemas: 0, prosas: 0, elementos: 0, itens: 0 };
    const chave = {
        parte: 'partes',
        secao: 'secoes',
        poema: 'poemas',
        prosa: 'prosas',
        elemento: 'elementos',
        item: 'itens',
    };
    const visitar = (nos) =>
        nos.forEach((n) => {
            c[chave[n.tipo]]++;
            if (n.filhos) visitar(n.filhos);
        });
    visitar(arvore);
    visitar(vinculados);
    return c;
}

// Posição válida: número inteiro positivo. `null`, vazio e 0 ficam "sem posição".
const posicaoDe = (no) => {
    const n = parseInt(no.dados ? no.dados.sequencia : no.sequencia);
    return n > 0 ? n : null;
};

// Posições que mais de um irmão ocupa. Posição repetida deixa a ordem ao acaso
// (desempata pela ordem de inserção) e trava o ▲▼ da aba Estrutura, que troca
// as posições de dois vizinhos: trocar dois valores iguais não muda nada.
export function posicoesRepetidas(irmaos) {
    const vistas = new Set();
    const repetidas = new Set();
    irmaos.forEach((no) => {
        const p = posicaoDe(no);
        if (p == null) return;
        if (vistas.has(p)) repetidas.add(p);
        vistas.add(p);
    });
    return repetidas;
}

// Renumera 1..N os irmãos que têm posição, na ordem em que estão na lista (a que a
// tela mostra, já desempatada). Quem está sem posição não ganha posição. Devolve
// quantos itens mudaram de valor. É o que permite ▲▼ valer também com posições
// repetidas, e não mexe em quem já está numerado 1..N sem repetição.
export function renumerarIrmaos(irmaos) {
    let mudou = 0;
    let proxima = 1;
    irmaos.forEach((no) => {
        if (posicaoDe(no) == null) return;
        const alvo = no.dados ? no.dados : no;
        if (alvo.sequencia !== proxima) {
            alvo.sequencia = proxima;
            mudou++;
        }
        proxima++;
    });
    return mudou;
}
