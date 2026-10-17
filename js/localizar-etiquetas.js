// Localizar e Substituir para as sete categorias de etiqueta (Fase 16,
// entrega 4). Lógica pura, sem DOM: a página localizar-substituir.html só
// chama estas funções.
//
// O campo guarda ids, mas quem busca e substitui trabalha com nomes. Cada
// etiqueta do texto cujo nome contém o termo vira uma ocorrência. Aplicar
// troca, NAQUELE texto, a etiqueta pela de nome novo (criada no cadastro
// se ainda não existe). O cadastro não é renomeado: renomear a etiqueta
// para todos os textos é função da aba Etiquetas. Nome que fica vazio
// remove a etiqueta do texto. Se o nome novo já existe no texto, a
// etiqueta some sem duplicar.

import {
    ETIQUETAS_CATEGORIAS,
    ROTULOS_ETIQUETAS,
    garantirEtiqueta,
    etiquetasDoTexto,
    limparNomeEtiqueta,
} from './etiquetas.js';

// Campos que o Localizar e Substituir oferece para as etiquetas, no formato
// de CAMPOS_POEMA/CAMPOS_PROSA da página. `categoria` marca o campo como
// de etiqueta.
export const CAMPOS_ETIQUETAS = Object.entries(ETIQUETAS_CATEGORIAS).map(([categoria, key]) => ({
    key,
    label: `Etiquetas: ${ROTULOS_ETIQUETAS[categoria]}`,
    categoria,
}));

export function categoriaDoCampoEtiqueta(campoKey) {
    const par = Object.entries(ETIQUETAS_CATEGORIAS).find(([, k]) => k === campoKey);
    return par ? par[0] : null;
}

function sub(texto, termo, novo, caseSensitive) {
    const t = caseSensitive ? texto : texto.toLowerCase();
    const q = caseSensitive ? termo : termo.toLowerCase();
    let saida = '';
    let i = 0;
    let n = 0;
    for (;;) {
        const pos = t.indexOf(q, i);
        if (pos === -1) {
            saida += texto.slice(i);
            break;
        }
        saida += texto.slice(i, pos) + novo;
        i = pos + q.length;
        n++;
    }
    return { texto: saida, ocorrencias: n };
}

// Ocorrências do termo nos nomes das etiquetas de `categoria` do texto.
// Devolve [{ id, nome, novoNome, ocorrencias }] (só as que mudam).
export function acharEtiquetasParaSubstituir(
    dbRef,
    item,
    categoria,
    termo,
    novoTermo,
    caseSensitive,
) {
    if (!termo) return [];
    const achadas = [];
    etiquetasDoTexto(dbRef, item, categoria).forEach(({ id, nome }) => {
        const r = sub(nome, termo, novoTermo, caseSensitive);
        if (r.ocorrencias === 0) return;
        achadas.push({
            id,
            nome,
            novoNome: limparNomeEtiqueta(r.texto),
            ocorrencias: r.ocorrencias,
        });
    });
    return achadas;
}

// Aplica a substituição no campo de etiqueta do texto. Devolve o número de
// ocorrências trocadas (0 se nada mudou).
export function substituirEtiquetasNoTexto(
    dbRef,
    item,
    categoria,
    termo,
    novoTermo,
    caseSensitive,
) {
    const campo = ETIQUETAS_CATEGORIAS[categoria];
    if (!campo) return 0;
    const achadas = acharEtiquetasParaSubstituir(
        dbRef,
        item,
        categoria,
        termo,
        novoTermo,
        caseSensitive,
    );
    if (achadas.length === 0) return 0;
    const porId = new Map(achadas.map((a) => [String(a.id), a]));
    const vistos = new Set();
    const novos = [];
    (Array.isArray(item[campo]) ? item[campo] : []).forEach((id) => {
        const a = porId.get(String(id));
        const destino = a ? garantirEtiqueta(dbRef, categoria, a.novoNome) : id;
        if (destino == null || vistos.has(String(destino))) return;
        vistos.add(String(destino));
        novos.push(destino);
    });
    item[campo] = novos;
    return achadas.reduce((s, a) => s + a.ocorrencias, 0);
}

// Para a lista de resultados da página: uma linha por campo, com os nomes
// antes e depois (já separados por vírgula, sem HTML).
export function resumoDeEtiquetas(dbRef, item, categoria, termo, novoTermo, caseSensitive) {
    const achadas = acharEtiquetasParaSubstituir(
        dbRef,
        item,
        categoria,
        termo,
        novoTermo,
        caseSensitive,
    );
    if (achadas.length === 0) return null;
    return {
        count: achadas.reduce((s, a) => s + a.ocorrencias, 0),
        antes: achadas.map((a) => a.nome),
        depois: achadas.map((a) => a.novoNome || ''),
    };
}
