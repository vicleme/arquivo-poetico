// ============================================================
// autoria-livro.js: autoria do Livro e da Coletânea, com papéis
// (Fase 19, etapa 4). Só lógica pura, sem DOM e sem `db.js`: os
// dados vêm por parâmetro (`dbRef`), como em `estrutura-livro.js`.
//
// Quem assina o livro é propriedade do livro, não do que ele
// contém (um livro que só traz o prefácio de alguém não é "do"
// prefaciador). Por isso é campo próprio, `autoriaLivro`, e não
// derivado dos textos. O nome é diferente de `autoria` (Poema e
// Prosa) de propósito: lá cada vínculo tem UM papel
// (`{ autorId, papel, assinatura, nomeLiterario }`), aqui cada
// vínculo tem VÁRIOS (`{ autorId, papeis }`), e um nome só para os
// dois confundiria quem relê o código.
//
//   livro.autoriaLivro = [{ autorId: 3, papeis: ['Autor', 'Tradutor'] }]
//
// Livro antigo, sem o campo, vale lista vazia: "ninguém registrado",
// nunca "sem autor". Não precisa de migração.
// ============================================================

export const PAPEIS_AUTORIA_LIVRO = [
    'Autor',
    'Coautor',
    'Organizador',
    'Tradutor',
    'Prefaciador',
    'Posfaciador',
];

// "Outro" não é papel gravado: é o jeito de digitar um papel que a lista
// não tem. O que se grava é o texto digitado.
export const ROTULO_PAPEL_OUTRO = 'Outro';

// Chave de comparação: sem caixa, sem acento, sem espaços nas pontas e
// com espaços repetidos compactados.
export function chavePapel(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

const PAPEL_POR_CHAVE = new Map(PAPEIS_AUTORIA_LIVRO.map((p) => [chavePapel(p), p]));

// Papel da lista fechada, com a grafia dela, ou `null` se for texto livre.
export function papelDaLista(texto) {
    return PAPEL_POR_CHAVE.get(chavePapel(texto)) || null;
}

// Texto livre = qualquer papel que não é da lista fechada.
export function papelEhOutro(texto) {
    return papelDaLista(texto) === null;
}

// Lista de papéis limpa: só texto, sem vazio, sem repetir (ignorando caixa e
// acento; vale a primeira), na ordem em que veio. Papel que casa com a lista
// fechada usa a grafia da lista ("tradutor" vira "Tradutor"); texto livre
// fica como foi digitado, só com os espaços arrumados. O próprio rótulo
// "Outro" sozinho não é papel (é o botão de escolher texto livre) e sai.
export function normalizarPapeis(lista) {
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    const saida = [];
    lista.forEach((bruto) => {
        if (typeof bruto !== 'string') return;
        const arrumado = bruto.replace(/\s+/g, ' ').trim();
        if (!arrumado) return;
        const chave = chavePapel(arrumado);
        if (chave === chavePapel(ROTULO_PAPEL_OUTRO)) return;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(papelDaLista(arrumado) || arrumado);
    });
    return saida;
}

// Autoria limpa: `[{ autorId, papeis }]`. Vínculo sem `autorId` sai. O mesmo
// Autor em dois vínculos vira um só (papéis somados, sem repetir, na ordem
// de chegada; o vínculo fica onde apareceu primeiro). Vínculo com a lista de
// papéis vazia é mantido: o formulário é quem exige pelo menos um papel, e
// descartar aqui apagaria em silêncio o que veio de uma importação.
export function normalizarAutoriaLivro(lista) {
    if (!Array.isArray(lista)) return [];
    const porAutor = new Map();
    const ordem = [];
    lista.forEach((v) => {
        if (!v || v.autorId === undefined || v.autorId === null || v.autorId === '') return;
        const chave = String(v.autorId);
        if (!porAutor.has(chave)) {
            porAutor.set(chave, { autorId: v.autorId, papeis: [] });
            ordem.push(chave);
        }
        const alvo = porAutor.get(chave);
        alvo.papeis = normalizarPapeis([
            ...alvo.papeis,
            ...(Array.isArray(v.papeis) ? v.papeis : []),
        ]);
    });
    return ordem.map((c) => porAutor.get(c));
}

// A autoria de um livro, em qualquer estado do dado (campo ausente, não lista).
export function autoriaDoLivro(livro) {
    return normalizarAutoriaLivro(livro?.autoriaLivro);
}

// Campos para gravar no livro: só existe a chave quando há pelo menos um
// vínculo (mesmo padrão de `camposDoSumario`), então "nada registrado" e
// "registrado e depois apagado" são o mesmo estado.
export function camposAutoriaLivro(lista) {
    const autoria = normalizarAutoriaLivro(lista);
    return autoria.length ? { autoriaLivro: autoria } : {};
}

// Vínculos que o formulário não pode gravar: Autor repetido ou sem papel.
// Devolve `{ semPapel: [autorId...] }`, vazio quando está tudo certo.
export function pendenciasDaAutoria(lista) {
    const semPapel = [];
    (Array.isArray(lista) ? lista : []).forEach((v) => {
        if (!v || v.autorId === undefined || v.autorId === null || v.autorId === '') return;
        if (normalizarPapeis(v.papeis).length === 0) semPapel.push(v.autorId);
    });
    return { semPapel };
}

// Sugestões de papel livre: o que já foi digitado em algum livro e não é da
// lista fechada, sem repetir e em ordem alfabética.
export function papeisLivresUsados(livros) {
    const vistos = new Map();
    (livros || []).forEach((l) => {
        autoriaDoLivro(l).forEach((v) =>
            v.papeis.forEach((p) => {
                if (papelEhOutro(p) && !vistos.has(chavePapel(p))) vistos.set(chavePapel(p), p);
            }),
        );
    });
    return Array.from(vistos.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ---------- Leitura ----------

// Pares `{ autor, papeis }` com o Autor do cadastro. Autor que não existe
// mais é ignorado (mesmo critério de `paresAutoria`, em `utils.js`).
export function paresAutoriaLivro(livro, autoresCadastro = []) {
    const porId = new Map((autoresCadastro || []).map((a) => [String(a.id), a]));
    const pares = [];
    autoriaDoLivro(livro).forEach((v) => {
        const autor = porId.get(String(v.autorId));
        if (autor) pares.push({ autor, papeis: v.papeis });
    });
    return pares;
}

// "Nome (Autor, Tradutor); Outra (Organizadora)": uma linha de texto para
// busca, `.md`, `.csv` e cards. Vínculo sem papel mostra só o nome.
export function textoAutoriaLivro(livro, autoresCadastro = []) {
    return paresAutoriaLivro(livro, autoresCadastro)
        .map(({ autor, papeis }) =>
            papeis.length ? `${autor.nome} (${papeis.join(', ')})` : autor.nome,
        )
        .join('; ');
}

// Autoria para sair em arquivo: `[{ autor: 'Nome', papeis: [...] }]`, só com
// nomes, porque o id do Autor não vale fora deste acervo. Mantém a ordem dos
// vínculos e a dos papéis. Autor que não existe mais no cadastro é ignorado.
export function autoriaLivroPorNome(livro, autoresCadastro = []) {
    return paresAutoriaLivro(livro, autoresCadastro).map(({ autor, papeis }) => ({
        autor: autor.nome,
        papeis: [...papeis],
    }));
}

// Livros em que o Autor consta na autoria do livro (não nos textos).
export function livrosDoAutor(livros, autorId) {
    return (livros || []).filter((l) =>
        autoriaDoLivro(l).some((v) => String(v.autorId) === String(autorId)),
    );
}

// O livro tem este Autor (qualquer papel) na autoria? `papel` opcional:
// só vale se o Autor tem aquele papel (ignora caixa e acento).
export function livroTemAutor(livro, autorId, papel = '') {
    const chaveDoPapel = chavePapel(papel);
    return autoriaDoLivro(livro).some(
        (v) =>
            String(v.autorId) === String(autorId) &&
            (!chaveDoPapel || v.papeis.some((p) => chavePapel(p) === chaveDoPapel)),
    );
}

// Autores que aparecem na autoria de algum livro, para o select do filtro:
// só quem existe no cadastro, em ordem alfabética, sem repetir.
export function autoresDosLivros(livros, autoresCadastro = []) {
    const ids = new Set();
    (livros || []).forEach((l) => autoriaDoLivro(l).forEach((v) => ids.add(String(v.autorId))));
    return (autoresCadastro || [])
        .filter((a) => ids.has(String(a.id)))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

// ---------- Autores dos textos do livro (derivado, só leitura) ----------

// Poemas e prosas que fazem parte do livro: os da árvore (Parte, Seção) mais
// os ligados só por `livrosIds`. Recebe a árvore já montada por
// `montarArvoreDoLivro` (`{ arvore, vinculados }`), para não importar o módulo
// da estrutura aqui e manter este sem dependências.
export function textosDaArvore({ arvore = [], vinculados = [] } = {}) {
    const achados = [];
    const vistos = new Set();
    const juntar = (tipo, id) => {
        const chave = `${tipo}-${id}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        achados.push({ tipo, id });
    };
    const visitar = (nos) =>
        (nos || []).forEach((n) => {
            if (n.tipo === 'poema' || n.tipo === 'prosa') juntar(n.tipo, n.dados.id);
            else if (
                n.tipo === 'item' &&
                n.dados?.refId &&
                ['poema', 'prosa'].includes(n.dados.refTipo)
            )
                juntar(n.dados.refTipo, n.dados.refId);
            if (n.filhos) visitar(n.filhos);
        });
    visitar(arvore);
    visitar(vinculados);
    return achados;
}

// Autores dos textos do livro, derivados do campo `autoria` de cada poema e
// prosa: `[{ autor, textos }]` (quantos textos do livro ele assina), do que
// mais assina para o que menos, depois por nome. Somente leitura: serve para
// a coletânea mostrar de quem são os textos sem decidir nada pelo livro.
export function autoresDosTextosDoLivro(dbRef, arvoreDoLivro) {
    const contagem = new Map();
    textosDaArvore(arvoreDoLivro).forEach(({ tipo, id }) => {
        const texto = (dbRef[tipo === 'poema' ? 'poemas' : 'prosas'] || []).find(
            (t) => String(t.id) === String(id),
        );
        if (!texto || !Array.isArray(texto.autoria)) return;
        const doTexto = new Set(texto.autoria.map((v) => String(v.autorId)));
        doTexto.forEach((autorId) => contagem.set(autorId, (contagem.get(autorId) || 0) + 1));
    });
    return (dbRef.autores || [])
        .filter((a) => contagem.has(String(a.id)))
        .map((autor) => ({ autor, textos: contagem.get(String(autor.id)) }))
        .sort(
            (a, b) =>
                b.textos - a.textos ||
                String(a.autor.nome).localeCompare(String(b.autor.nome), 'pt-BR'),
        );
}

// ---------- Exclusão de Autor ----------

// Livros que perdem este Autor se ele for excluído (só desvincula: o livro
// continua existindo). F19-D14: aviso com a contagem e Desfazer.
export function impactoExclusaoAutorNosLivros(dbRef, autorId) {
    return { livrosIds: livrosDoAutor(dbRef.livros, autorId).map((l) => l.id) };
}

// Tira o Autor da autoria de todo livro e devolve o que saiu, para o Desfazer:
// `[{ livroId, entrada }]` (a entrada inteira, com os papéis, e a posição
// original na lista).
export function removerAutorDosLivros(dbRef, autorId) {
    const removidos = [];
    (dbRef.livros || []).forEach((livro) => {
        if (!Array.isArray(livro.autoriaLivro)) return;
        for (let i = livro.autoriaLivro.length - 1; i >= 0; i--) {
            if (String(livro.autoriaLivro[i].autorId) === String(autorId)) {
                removidos.push({ livroId: livro.id, entrada: livro.autoriaLivro[i], indice: i });
                livro.autoriaLivro.splice(i, 1);
            }
        }
        if (livro.autoriaLivro.length === 0) delete livro.autoriaLivro;
    });
    return removidos;
}

// Desfaz `removerAutorDosLivros`: devolve cada entrada ao livro, na posição de
// antes. Livro que já não existe é ignorado. Repetido não duplica.
export function restaurarAutorNosLivros(dbRef, removidos) {
    // Do menor índice para o maior, para cada entrada voltar ao lugar dela.
    [...(removidos || [])]
        .sort((a, b) => a.indice - b.indice)
        .forEach(({ livroId, entrada, indice }) => {
            const livro = (dbRef.livros || []).find((l) => String(l.id) === String(livroId));
            if (!livro) return;
            livro.autoriaLivro ||= [];
            if (livro.autoriaLivro.some((v) => String(v.autorId) === String(entrada.autorId)))
                return;
            livro.autoriaLivro.splice(Math.min(indice, livro.autoriaLivro.length), 0, entrada);
        });
}
