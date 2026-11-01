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
//
// Fase 21 (21-3b e 21-3c): a árvore do livro, da Parte e da Seção lê os textos
// pela lista de aparições, não pelo Destino do espelho. O mesmo texto aparece na
// árvore de cada livro onde está (e em cada Parte ou Seção em que tem uma
// aparição), com a posição daquela aparição; o "só consta" (aparição sem lugar
// nem posição) vira a lista de vinculados. `filhosTopoDoLivro`, `filhosDaParte`
// e `filhosDaSecao` leem por aparição com `{ porAparicao: true }` (o que a aba
// Estrutura e as montagens de árvore usam); sem a opção leem só pelo Destino.
// ============================================================

import { escopoDoLugar, temLugar } from './aparicoes-dado.js';

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

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// O nó de um texto numa aparição que NÃO é o Destino do espelho: uma cópia do
// texto cujo `sequencia` lê e grava a posição da própria aparição (assim quem
// ordena ou renumera os irmãos não precisa saber a diferença), com o Destino
// (`paiTipo`, `paiId`) do lugar onde ela está. `_texto` e `_aparicao` dão o
// texto real e a aparição (não enumeráveis: não saem em cópia nem em JSON).
function dadosDaAparicao(texto, aparicao, paiTipo, paiId) {
    const copia = { ...texto, paiTipo, paiId };
    Object.defineProperty(copia, 'sequencia', {
        enumerable: true,
        get: () => aparicao.sequencia ?? null,
        set: (v) => {
            aparicao.sequencia = v;
        },
    });
    Object.defineProperty(copia, '_texto', { value: texto });
    Object.defineProperty(copia, '_aparicao', { value: aparicao });
    return copia;
}

// Os Poemas ou Prosas (`tipo`) de um lugar (`paiTipo`, `paiId`) como nós.
// Com `porAparicao`, um nó por texto que tem aparição com lugar ali; o texto
// cujo Destino é aquele lugar entra como ele mesmo, os outros como cópia (ver
// `dadosDaAparicao`). Texto sem lista (dado só do formato antigo) entra pelo
// Destino, como sempre. Sem `porAparicao`, é só o Destino.
function nosDeTexto(dbRef, tipo, paiTipo, paiId, porAparicao) {
    return lista(dbRef, `${tipo}s`).flatMap((t) => {
        const pelaDestino =
            (t.paiTipo === paiTipo && mesmoId(t.paiId, paiId)) ||
            (tipo === 'prosa' && paiTipo === 'secao' && mesmoId(t.secaoId, paiId));
        if (!porAparicao || !Array.isArray(t.aparicoes)) {
            return pelaDestino ? [{ tipo, dados: t }] : [];
        }
        const a = t.aparicoes.find((x) => {
            if (!temLugar(x)) return false;
            const [pt, pi] = escopoDoLugar(x);
            return pt === paiTipo && mesmoId(pi, paiId);
        });
        if (!a) return [];
        const eEspelho = t.paiTipo === paiTipo && mesmoId(t.paiId, paiId);
        return [{ tipo, dados: eEspelho ? t : dadosDaAparicao(t, a, paiTipo, paiId) }];
    });
}

export function filhosTopoDoLivro(dbRef, livroId, { porAparicao = false } = {}) {
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
        ...nosDeTexto(dbRef, 'poema', 'livro', livroId, porAparicao),
        ...nosDeTexto(dbRef, 'prosa', 'livro', livroId, porAparicao),
    ]);
}

export function filhosDaParte(dbRef, parteId, { porAparicao = false } = {}) {
    return ordenarPorSeq([
        ...lista(dbRef, 'secoes')
            .filter((s) => s.paiTipo === 'parte' && s.paiId == parteId)
            .map((s) => ({ tipo: 'secao', dados: s })),
        ...lista(dbRef, 'elementos')
            .filter((e) => e.paiTipo === 'parte' && e.paiId == parteId)
            .map((e) => ({ tipo: 'elemento', dados: e })),
        ...nosDeTexto(dbRef, 'poema', 'parte', parteId, porAparicao),
        ...nosDeTexto(dbRef, 'prosa', 'parte', parteId, porAparicao),
    ]);
}

export function filhosDaSecao(dbRef, secaoId, { porAparicao = false } = {}) {
    return ordenarPorSeq([
        ...lista(dbRef, 'elementos')
            .filter((e) => e.paiTipo === 'secao' && e.paiId == secaoId)
            .map((e) => ({ tipo: 'elemento', dados: e })),
        ...nosDeTexto(dbRef, 'poema', 'secao', secaoId, porAparicao),
        ...nosDeTexto(dbRef, 'prosa', 'secao', secaoId, porAparicao),
    ]);
}

function comFilhos(dbRef, no, porAparicao = false) {
    const opcoes = { porAparicao };
    if (no.tipo === 'parte') {
        const filhos = filhosDaParte(dbRef, no.dados.id, opcoes);
        return { ...no, filhos: filhos.map((f) => comFilhos(dbRef, f, porAparicao)) };
    }
    if (no.tipo === 'secao') {
        const filhos = filhosDaSecao(dbRef, no.dados.id, opcoes);
        return { ...no, filhos: filhos.map((f) => comFilhos(dbRef, f, porAparicao)) };
    }
    return no;
}

// Texto descartado: sai da estrutura e vai para o "Fora de escopo" do livro
// (fora-de-escopo.js), para não aparecer em dois lugares.
const ehDescartado = (no) =>
    (no.tipo === 'poema' || no.tipo === 'prosa') && no.dados?.status === 'descartado';

export function semDescartadosNaArvore(nos) {
    return nos
        .filter((n) => !ehDescartado(n))
        .map((n) => (n.filhos ? { ...n, filhos: semDescartadosNaArvore(n.filhos) } : n));
}

// Árvore do livro para leitura: { arvore, vinculados }.
// - Livro comum: Partes, Seções, Elementos, Poemas e Prosas na ordem da aba Estrutura.
// - Coletânea: Partes (por sequência) e os itens de cada uma (`itensColetanea`).
// - `vinculados`: poemas e prosas que só constam no livro (aparição sem Parte,
//   Seção nem posição; no formato antigo, ligados por `livrosIds`), sem posição
//   na árvore (não fingem uma posição que não existe). Fora da árvore por
//   definição; ordenados por título. Coletânea não tem vinculados.
// - Os textos vêm pelas aparições: o mesmo texto aparece na árvore de cada livro
//   onde está, com a posição daquela aparição.
// - `opcoes.semDescartados` (padrão false): tira da árvore e dos vinculados os
//   textos com status "descartado", que passam a viver só no Fora de escopo.
//   Não vale para Coletânea (os itens dela só apontam para os textos).
export function montarArvoreDoLivro(dbRef, livroId, opcoes = {}) {
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

    const arvore = filhosTopoDoLivro(dbRef, livroId, { porAparicao: true }).map((n) =>
        comFilhos(dbRef, n, true),
    );

    const naArvore = new Set();
    const coletar = (nos) =>
        nos.forEach((n) => {
            if (n.tipo === 'poema' || n.tipo === 'prosa') naArvore.add(`${n.tipo}-${n.dados.id}`);
            if (n.filhos) coletar(n.filhos);
        });
    coletar(arvore);

    // Com a lista, só consta quem tem aparição neste livro sem lugar; sem ela
    // (formato antigo), quem tem o livro em `livrosIds`.
    const liga = (t) =>
        Array.isArray(t.aparicoes)
            ? t.aparicoes.some((a) => mesmoId(a.livroId, livroId) && !temLugar(a))
            : Array.isArray(t.livrosIds) && t.livrosIds.some((x) => String(x) === String(livroId));
    const vinculados = ['poema', 'prosa']
        .flatMap((tipo) =>
            lista(dbRef, tipo + 's')
                .filter((t) => liga(t) && !naArvore.has(`${tipo}-${t.id}`))
                .map((t) => ({ tipo, dados: t })),
        )
        .sort((a, b) =>
            String(a.dados.titulo || '').localeCompare(String(b.dados.titulo || ''), 'pt-BR'),
        );

    if (opcoes.semDescartados) {
        return {
            arvore: semDescartadosNaArvore(arvore),
            vinculados: vinculados.filter((n) => !ehDescartado(n)),
        };
    }
    return { arvore, vinculados };
}

// Árvore de uma Parte só (Seções, Elementos, Poemas e Prosas dela, na ordem da aba
// Estrutura) e de uma Seção só (Elementos, Poemas e Prosas). Mesmo formato de
// `montarArvoreDoLivro` ({ arvore, vinculados }), para o Ver de Parte e de Seção
// reaproveitarem o desenho da Estrutura. Sem `vinculados`: o vínculo por
// `livrosIds` é do Livro, não de uma Parte nem de uma Seção.
export function montarArvoreDaParte(dbRef, parteId, opcoes = {}) {
    const arvore = filhosDaParte(dbRef, parteId, { porAparicao: true }).map((n) =>
        comFilhos(dbRef, n, true),
    );
    return {
        arvore: opcoes.semDescartados ? semDescartadosNaArvore(arvore) : arvore,
        vinculados: [],
    };
}

export function montarArvoreDaSecao(dbRef, secaoId, opcoes = {}) {
    const arvore = filhosDaSecao(dbRef, secaoId, { porAparicao: true }).map((n) =>
        comFilhos(dbRef, n, true),
    );
    return {
        arvore: opcoes.semDescartados ? semDescartadosNaArvore(arvore) : arvore,
        vinculados: [],
    };
}

// Título e rótulo de tipo de um nó, como o Ver do livro os mostra. Fonte única:
// o Ver (visualizar-livro.js) e as saídas com estrutura (estrutura-livro-saida.js)
// leem daqui, para nunca divergirem.
export function tituloDoNo(no) {
    const d = no.dados || {};
    if (no.tipo === 'elemento') {
        const rotulo = d.tipo || 'Elemento';
        return d.titulo ? `${rotulo}: ${d.titulo}` : rotulo;
    }
    return d.titulo || '(sem título)';
}

export function rotuloTipoDoNo(no) {
    if (no.tipo === 'item') return no.dados.refId ? no.dados.refTipo || '?' : 'inédito';
    return no.tipo;
}

// Contagem por tipo em toda a árvore mais os vinculados (um texto conta uma vez,
// mesmo com duas aparições no mesmo livro).
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
    const textosVistos = new Set();
    const visitar = (nos) =>
        nos.forEach((n) => {
            if (n.tipo === 'poema' || n.tipo === 'prosa') {
                const id = `${n.tipo}-${n.dados.id}`;
                if (textosVistos.has(id)) return;
                textosVistos.add(id);
            }
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
