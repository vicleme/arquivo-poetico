// ============================================================
// nesting.js — Lógica de encadeamento hierárquico
// Usado por: exportar.js (exportarTudoAninhado)
// ============================================================

import { escopoDoLugar, temLugar } from './aparicoes-dado.js';
import { autoriaLivroPorNome } from './autoria-livro.js';
import { equipeLivroPorNome } from './colaboradores-livro.js';
import { usoIaParaExportar } from './uso-ia-livro.js';

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Os textos de um lugar (`paiTipo`, `paiId`) no tudo aninhado (Fase 21, 21-3b),
// lidos pelas aparições: o mesmo texto sai dentro de cada livro (e Parte ou
// Seção) onde está. O texto cujo Destino é aquele lugar sai como ele mesmo; nos
// outros, uma cópia com o Destino e a posição daquela aparição, para quem lê o
// JSON ver o lugar certo. Texto sem lista (formato antigo) sai pelo Destino.
function textosDoLugar(textos, paiTipo, paiId) {
    return textos.flatMap((t) => {
        const eEspelho = t.paiTipo === paiTipo && mesmoId(t.paiId, paiId);
        if (!Array.isArray(t.aparicoes)) return eEspelho ? [t] : [];
        const a = t.aparicoes.find((x) => {
            if (!temLugar(x)) return false;
            const [pt, pi] = escopoDoLugar(x);
            return pt === paiTipo && mesmoId(pi, paiId);
        });
        if (!a) return [];
        if (eEspelho) return [t];
        return [{ ...t, paiTipo, paiId, sequencia: a.sequencia ?? null }];
    });
}

// Os textos que só "constam" no livro (aparição sem Parte, Seção nem posição):
// não têm lugar na árvore e saem à parte, em `conteudo_*_vinculad*`.
const textosVinculados = (textos, livroId) =>
    textos.filter(
        (t) =>
            Array.isArray(t.aparicoes) &&
            t.aparicoes.some((a) => mesmoId(a.livroId, livroId) && !temLugar(a)),
    );

export function buildNesting(db) {
    const nest = db.livros.map((livro) => {
        const l = { ...livro };

        // `autoriaLivro` (ids de Autor) segue como está, para o backup; o nome
        // é o que vale fora deste acervo. Só existe com pelo menos um vínculo.
        const autoria = autoriaLivroPorNome(livro, db.autores || []);
        if (autoria.length) l.autoria_livro = autoria;

        // Idem a Equipe e créditos: `equipeLivro` (ids de Colaborador) segue para o
        // backup; `equipe_livro` sai por nome, com os papéis e escopos. Só com
        // pelo menos uma pessoa que ainda existe no cadastro.
        const equipe = equipeLivroPorNome(livro, db.colaboradores || []);
        if (equipe.length) l.equipe_livro = equipe;

        // Idem o Uso de IA: `usoIa` (com `{ tipo, id }` do texto ligado) segue para o
        // backup; `uso_ia` sai com o título do texto no lugar do id. Só quando há
        // estado ou nota ("Não informado" não vira chave).
        const usoIa = usoIaParaExportar(livro, db);
        if (usoIa) l.uso_ia = usoIa;

        l.conteudo_elementos = (db.elementos || []).filter(
            (e) => e.paiId == l.id && e.paiTipo === 'livro',
        );
        l.conteudo_poemas_diretos = textosDoLugar(db.poemas, 'livro', l.id);
        l.conteudo_prosas_diretas = textosDoLugar(db.prosas || [], 'livro', l.id);
        const poemasVinculados = textosVinculados(db.poemas, l.id);
        const prosasVinculadas = textosVinculados(db.prosas || [], l.id);
        if (poemasVinculados.length) l.conteudo_poemas_vinculados = poemasVinculados;
        if (prosasVinculadas.length) l.conteudo_prosas_vinculadas = prosasVinculadas;
        l.conteudo_partes = db.partes
            .filter((p) => p.livroId == l.id)
            .map((parte) => {
                const p = { ...parte };
                p.conteudo_elementos = (db.elementos || []).filter(
                    (e) => e.paiId == p.id && e.paiTipo === 'parte',
                );
                p.conteudo_poemas_diretos = textosDoLugar(db.poemas, 'parte', p.id);
                p.conteudo_prosas_diretas = textosDoLugar(db.prosas || [], 'parte', p.id);
                p.conteudo_secoes = getSecoes(p.id, 'parte', db);
                return p;
            });

        l.conteudo_secoes_diretas = getSecoes(l.id, 'livro', db);

        return l;
    });

    // Avulso: texto sem aparição nenhuma. Com a lista, o "só consta" já saiu no
    // livro dele (`conteudo_*_vinculad*`); sem ela, vale o Destino, como antes.
    const semAparicao = (t) =>
        Array.isArray(t.aparicoes) ? !t.aparicoes.length : !t.paiTipo || !t.paiId;
    const avulsos_poemas = db.poemas.filter(semAparicao);
    const avulsos_prosas = (db.prosas || []).filter(semAparicao);

    return {
        export_format: 'deep_nesting',
        data: nest,
        avulsos: {
            poemas: avulsos_poemas,
            prosas: avulsos_prosas,
        },
    };
}

// Mesma árvore de buildNesting, mas devolve só um Livro (com seus próprios
// campos — título, sinopse, capa-id etc. — já junto do conteúdo aninhado).
// Usado pra exportar "este livro completo" sem precisar baixar o acervo todo.
export function buildNestingLivro(db, livroId) {
    const completo = buildNesting(db);
    return completo.data.find((l) => String(l.id) === String(livroId)) || null;
}

export function getSecoes(paiId, paiTipo, db) {
    return db.secoes
        .filter((s) => s.paiId == paiId && s.paiTipo === paiTipo)
        .map((secao) => {
            const s = { ...secao };
            s.conteudo_elementos = (db.elementos || []).filter(
                (e) => e.paiId == s.id && e.paiTipo === 'secao',
            );
            s.conteudo_poemas = textosDoLugar(db.poemas, 'secao', s.id);
            s.conteudo_prosas = textosDoLugar(db.prosas || [], 'secao', s.id);
            return s;
        });
}

// ─── Desaninhamento (caminho inverso de buildNesting) ─────────
// Usado por filtrar.html: quando alguém carrega lá um JSON gerado por
// exportarTudoAninhado/exportarLivroCompleto/exportarLivrosCompletos,
// essas funções desmontam a árvore Livro → Parte → Seção → Poema/Prosa
// de volta numa lista plana, com o contexto (livro/parte/seção) já
// resolvido em cada item.
//
// Ficam aqui — junto de buildNesting, que é quem define os nomes de
// campo dessa árvore (conteudo_partes, conteudo_poemas_diretos etc.)
// — pra não duplicar esse contrato de formato em dois arquivos que
// podem sair de sincronia entre si.

function flattenSecaoAninhada(secao, nomeLivro, nomeParte, poemasOut, prosasOut) {
    const nomeSecao = secao.titulo || null;
    const contexto = { livro: nomeLivro, parte: nomeParte, secao: nomeSecao };
    (secao.conteudo_poemas || []).forEach((p) => poemasOut.push({ ...p, contexto }));
    (secao.conteudo_prosas || []).forEach((p) => prosasOut.push({ ...p, contexto }));
}

export function flattenLivroAninhado(livro, poemasOut, prosasOut) {
    const nomeLivro = livro.siglaOficial || livro.siglaPessoal || livro.titulo || null;

    let contexto = { livro: nomeLivro, parte: null, secao: null };
    (livro.conteudo_poemas_diretos || []).forEach((p) => poemasOut.push({ ...p, contexto }));
    (livro.conteudo_prosas_diretas || []).forEach((p) => prosasOut.push({ ...p, contexto }));
    // Os que só constam no livro (sem Parte, Seção nem posição): o contexto é o livro.
    (livro.conteudo_poemas_vinculados || []).forEach((p) => poemasOut.push({ ...p, contexto }));
    (livro.conteudo_prosas_vinculadas || []).forEach((p) => prosasOut.push({ ...p, contexto }));

    (livro.conteudo_secoes_diretas || []).forEach((secao) =>
        flattenSecaoAninhada(secao, nomeLivro, null, poemasOut, prosasOut),
    );

    (livro.conteudo_partes || []).forEach((parte) => {
        const nomeParte = parte.titulo || null;
        const contextoParte = { livro: nomeLivro, parte: nomeParte, secao: null };
        (parte.conteudo_poemas_diretos || []).forEach((p) =>
            poemasOut.push({ ...p, contexto: contextoParte }),
        );
        (parte.conteudo_prosas_diretas || []).forEach((p) =>
            prosasOut.push({ ...p, contexto: contextoParte }),
        );
        (parte.conteudo_secoes || []).forEach((secao) =>
            flattenSecaoAninhada(secao, nomeLivro, nomeParte, poemasOut, prosasOut),
        );
    });
}

// Detecta se um objeto "parece" um Livro aninhado (tem ao menos uma das
// chaves de conteúdo que só existem nessa árvore, geradas por buildNesting).
export function pareceLivroAninhado(obj) {
    return (
        !!obj &&
        ('conteudo_partes' in obj ||
            'conteudo_poemas_diretos' in obj ||
            'conteudo_secoes_diretas' in obj)
    );
}

// Junta as cópias do mesmo texto (mesmo `id`) que o desaninhamento deixa quando o
// texto aparece em mais de um livro (Fase 21: a árvore o traz uma vez por lugar).
// Fica a primeira cópia, na ordem em que apareceu; quando há mais de um lugar
// diferente, ela ganha `contextos`: a lista de todos os `{ livro, parte, secao }`,
// sem repetir, e `contexto` segue sendo o primeiro. Item sem `id`, ou que só
// aparece uma vez, passa como está. O `filtrar.html` trabalha por tipo e id
// (versões filtradas), então precisa de uma linha por texto.
export function juntarTextosRepetidos(lista) {
    const mesmoContexto = (a, b) =>
        (a?.livro ?? null) === (b?.livro ?? null) &&
        (a?.parte ?? null) === (b?.parte ?? null) &&
        (a?.secao ?? null) === (b?.secao ?? null);
    const saida = [];
    const porId = new Map();
    for (const item of lista || []) {
        if (item?.id == null) {
            saida.push(item);
            continue;
        }
        const chave = String(item.id);
        const primeiro = porId.get(chave);
        if (!primeiro) {
            porId.set(chave, item);
            saida.push(item);
            continue;
        }
        const contextos = primeiro.contextos || (primeiro.contexto ? [primeiro.contexto] : []);
        if (item.contexto && !contextos.some((c) => mesmoContexto(c, item.contexto))) {
            contextos.push(item.contexto);
        }
        if (contextos.length > 1) primeiro.contextos = contextos;
    }
    return saida;
}

// O rótulo do lugar de um texto no `filtrar.html`: livro, senão Parte, senão
// Seção de cada contexto, sem repetir e separados por vírgula. Sem contexto, null.
export function rotuloDosLugares(item) {
    const lista = item?.contextos?.length ? item.contextos : item?.contexto ? [item.contexto] : [];
    const rotulos = [];
    lista.forEach((c) => {
        const r = c?.livro || c?.parte || c?.secao || null;
        if (r && !rotulos.includes(r)) rotulos.push(r);
    });
    return rotulos.length ? rotulos.join(', ') : null;
}
