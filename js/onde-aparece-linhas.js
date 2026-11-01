// ============================================================
// onde-aparece-linhas.js: a lógica pura do grupo "Onde aparece" dos modais de
// Poema e Prosa (Fase 21, etapa 21-2, entrega 2). Sem DOM e sem importar o
// `db`: os dados vêm por `dbRef`.
//
// Cada linha do modal é uma aparição do texto:
//   { livroId, lugar, modo, sequencia }
//   - `livroId`: o livro (só livros comuns; Coletânea fica na aba Coletâneas);
//   - `lugar`: '' (o texto só "consta" no livro), 'livro:ID' (a raiz do livro,
//     entre as Partes), 'parte:ID' ou 'secao:ID';
//   - `modo`: 'fim' (no fim da fila), 'especifica' (a posição digitada) ou
//     'nenhuma' (no lugar, mas fora da numeração);
//   - `sequencia`: a posição digitada (só vale no modo 'especifica').
// Sem lugar não há fila: a linha não tem modo nem posição.
//
// `linhasDoTexto` lê as linhas de um texto salvo; `linhasParaSalvar` converte
// as linhas no que `salvarAparicoesDoTexto` espera. O filtro de livro de cada
// linha é o próprio livro da linha: `opcoesDeLugar` devolve só a estrutura
// daquele livro.
// ============================================================

import { aparicoesDeFormatoAntigo, temLugar } from './aparicoes-dado.js';
import { seqOuNull } from './utils.js';

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);
const lista = (dbRef, nome) => (Array.isArray(dbRef?.[nome]) ? dbRef[nome] : []);
const posicao = (x) => parseInt(x?.sequencia) || 9999;

export const MODOS_DE_POSICAO = [
    { valor: 'fim', rotulo: 'No fim da fila' },
    { valor: 'especifica', rotulo: 'Posição específica' },
    { valor: 'nenhuma', rotulo: 'Sem posição' },
];

// Livros que aceitam aparição: os comuns (Coletânea tem estrutura própria).
export function livrosParaAparicao(dbRef) {
    return lista(dbRef, 'livros').filter((l) => l.tipo !== 'Coletânea');
}

// As opções do select de lugar de um livro, já na ordem da estrutura real:
// Parte 1 (e suas Seções), Parte 2 (e suas Seções), e as Seções soltas direto
// no Livro entram na posição certa pela sequência. Cada opção é
// { valor, rotulo, nivel }. A primeira é sempre "só consta"; a segunda, a raiz
// do livro. Sem livro escolhido, só a primeira.
export function opcoesDeLugar(dbRef, livroId) {
    const opcoes = [{ valor: '', rotulo: 'Só consta no livro (sem lugar)', nivel: 0 }];
    if (livroId == null || livroId === '') return opcoes;
    const livro = lista(dbRef, 'livros').find((l) => mesmoId(l.id, livroId));
    if (!livro) return opcoes;
    opcoes.push({
        valor: `livro:${livro.id}`,
        rotulo: 'O livro inteiro (fora de Partes e Seções)',
        nivel: 0,
    });
    const partes = lista(dbRef, 'partes').filter((p) => mesmoId(p.livroId, livro.id));
    const secoesDiretas = lista(dbRef, 'secoes').filter(
        (s) => s.paiTipo === 'livro' && mesmoId(s.paiId, livro.id),
    );
    const topo = [
        ...partes.map((item) => ({ tipo: 'parte', item })),
        ...secoesDiretas.map((item) => ({ tipo: 'secao', item })),
    ].sort((a, b) => posicao(a.item) - posicao(b.item));
    topo.forEach(({ tipo, item }) => {
        if (tipo === 'parte') {
            opcoes.push({ valor: `parte:${item.id}`, rotulo: item.titulo || '', nivel: 1 });
            lista(dbRef, 'secoes')
                .filter((s) => s.paiTipo === 'parte' && mesmoId(s.paiId, item.id))
                .sort((a, b) => posicao(a) - posicao(b))
                .forEach((s) =>
                    opcoes.push({ valor: `secao:${s.id}`, rotulo: s.titulo || '', nivel: 2 }),
                );
        } else {
            opcoes.push({ valor: `secao:${item.id}`, rotulo: item.titulo || '', nivel: 1 });
        }
    });
    return opcoes;
}

// O valor do select de lugar de uma aparição (a Seção manda mais que a Parte, e
// a Parte mais que o Livro). Aparição sem lugar (só consta) vira ''.
export function lugarDaAparicao(a) {
    if (!a || !temLugar(a)) return '';
    if (a.secaoId != null) return `secao:${a.secaoId}`;
    if (a.parteId != null) return `parte:${a.parteId}`;
    return `livro:${a.livroId}`;
}

// As linhas de um texto já salvo, na ordem da lista de aparições. Com posição: modo
// 'especifica'; no lugar sem posição: 'nenhuma'; sem lugar: sem modo.
// Texto sem a lista (ainda no formato antigo) lê do Destino e de `livrosIds`.
// Texto novo (null) não tem linha.
export function linhasDoTexto(dbRef, item) {
    if (!item) return [];
    const aparicoes = Array.isArray(item.aparicoes)
        ? item.aparicoes
        : aparicoesDeFormatoAntigo(dbRef, item);
    return aparicoes.map((a) => {
        const lugar = lugarDaAparicao(a);
        const seq = seqOuNull(a.sequencia);
        return {
            livroId: a.livroId,
            lugar,
            modo: !lugar ? null : seq !== null ? 'especifica' : 'nenhuma',
            sequencia: seq,
        };
    });
}

// Quebra o valor de um select de lugar em [tipo, id] ('' vira [null, null]).
export function partesDoLugar(valor) {
    if (!valor) return [null, null];
    const [tipo, id] = String(valor).split(':');
    return [tipo, id === undefined || id === '' ? null : parseInt(id)];
}

// Converte as linhas do modal no que `salvarAparicoesDoTexto` lê. Linha sem
// livro é ignorada (linha em branco). Lugar de outro livro que o da linha vale
// o lugar (a Parte ou Seção mandam: `salvarAparicoesDoTexto` deriva o livro
// delas). Linha sem lugar vira "só consta" (modo 'nenhuma').
export function linhasParaSalvar(linhas) {
    const saida = [];
    (Array.isArray(linhas) ? linhas : []).forEach((l) => {
        const livroId = seqOuNull(l?.livroId);
        if (livroId === null) return;
        const [tipo, id] = partesDoLugar(l.lugar);
        saida.push({
            livroId,
            parteId: tipo === 'parte' ? id : null,
            secaoId: tipo === 'secao' ? id : null,
            sequencia: tipo ? seqOuNull(l.sequencia) : null,
            modo: tipo ? l.modo || 'fim' : 'nenhuma',
        });
    });
    return saida;
}

// Linhas que apontam para o mesmo lugar (a função de salvar guarda só a
// primeira). Devolve os índices das repetidas, para o modal avisar.
export function linhasRepetidas(linhas) {
    const vistos = new Set();
    const repetidas = [];
    (Array.isArray(linhas) ? linhas : []).forEach((l, i) => {
        const livroId = seqOuNull(l?.livroId);
        if (livroId === null) return;
        const chave = `${livroId}|${l.lugar || ''}`;
        if (vistos.has(chave)) repetidas.push(i);
        else vistos.add(chave);
    });
    return repetidas;
}

// A aparição que as telas antigas enxergam como Destino: a primeira linha com
// lugar. Serve ao "Cortado de" do Descartado e à sugestão da data de
// publicação. `posicaoDoFim(livroId, lugar)` calcula a posição do modo 'fim'.
export function destinoDasLinhas(linhas, posicaoDoFim = () => null) {
    const linha = (Array.isArray(linhas) ? linhas : []).find(
        (l) => seqOuNull(l?.livroId) !== null && l.lugar,
    );
    if (!linha) return { paiTipo: null, paiId: null, sequencia: null };
    const [paiTipo, paiId] = partesDoLugar(linha.lugar);
    const modo = linha.modo || 'fim';
    const sequencia =
        modo === 'nenhuma'
            ? null
            : modo === 'fim'
              ? posicaoDoFim(linha.livroId, linha.lugar)
              : seqOuNull(linha.sequencia);
    return { paiTipo, paiId, sequencia };
}

// Descartado não ocupa vaga: todas as linhas com lugar viram "sem posição".
export function linhasSemPosicao(linhas) {
    return (Array.isArray(linhas) ? linhas : []).map((l) =>
        l.lugar ? { ...l, modo: 'nenhuma', sequencia: null } : { ...l },
    );
}
